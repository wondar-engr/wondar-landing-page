import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { sendNotification } from "../lib/notifications";
import { bookingStartToUtcMs } from "@convex/utils/time";
import { getBookingContext } from "./bookingContext";

const MIN = 60 * 1000;
const NO_SHOW_GRACE_MS = 30 * 60 * 1000; // keep equal to GRACE_CREATIVE_NO_SHOW_MS in bookingFns.ts
const UNPAID_GRACE_MS = 20 * 60 * 1000; // keep equal to GRACE_UNPAID_FINAL_MS in bookingFns.ts

const PAYMENT_FAST_WINDOW_MS = 2 * 60 * 60 * 1000;
const PAYMENT_FAST_EVERY_MS = 30 * 60 * 1000;
const PAYMENT_SLOW_EVERY_MS = 3 * 60 * 60 * 1000;
const PAYMENT_FLAG_AFTER_MS = 24 * 60 * 60 * 1000;

// Client ladder, measured against the booked start time (offset = now - start):
// 1 = 24h before   2 = 1h before   3 = 15 min before
const CLIENT_STAGES = [
    { stage: 1, at: -24 * 60 * MIN },
    { stage: 2, at: -60 * MIN },
    { stage: 3, at: -15 * MIN },
    { stage: 4, at: 0 }, // start time: only sent while the balance is unpaid
];
const CLIENT_SEND_WINDOW_MS = 10 * MIN; // stages crossed longer ago than this are skipped silently

// Stage ladder, measured against the booked start time:
// 1 = 30 min before   2 = 5 min before   3 = 5 min after   4 = 15 min after
function dueStageFor(offsetMs: number): number | null {
    if (offsetMs < -30 * MIN) return 0; // too early: nothing due yet
    if (offsetMs < -5 * MIN) return 1;
    if (offsetMs < 5 * MIN) return 2;
    if (offsetMs < 15 * MIN) return 3;
    if (offsetMs < NO_SHOW_GRACE_MS) return 4;
    return null; // the no-show rule owns it from here
}

function startReminderCopy(
    stage: number,
    offsetMs: number,
    clientName: string,
    serviceName: string,
) {
    const session = `your session with ${clientName} for "${serviceName}"`;

    if (stage === 1 || (stage === 2 && offsetMs < 0)) {
        const mins = Math.max(Math.round(-offsetMs / MIN), 1);
        return {
            title: "Get ready for your service",
            body: `Heads up: ${session} starts in about ${mins} minute${mins === 1 ? "" : "s"}. Get ready, and tap Start Service when you begin.`,
        };
    }
    if (stage === 2) {
        return {
            title: "Your service is starting",
            body: `${session} is starting now. Tap Start Service when you begin.`,
        };
    }
    if (stage === 3) {
        return {
            title: "Time to start your service",
            body: `${session} was due to start 5 minutes ago. Tap Start Service when you begin.`,
        };
    }
    return {
        title: "Please start your service",
        body: `${session} was due 15 minutes ago and hasn't started. Please start it or message the client. At 30 minutes it is flagged as a no-show.`,
    };
}

function clientDueStage(offsetMs: number) {
    if (offsetMs >= UNPAID_GRACE_MS) return null; // past grace: the lifecycle job owns it
    let due = { stage: 0, crossedAgoMs: 0 };
    for (const s of CLIENT_STAGES) {
        if (offsetMs >= s.at) {
            due = { stage: s.stage, crossedAgoMs: offsetMs - s.at };
        }
    }
    return due;
}

function clientReminderCopy(
    stage: number,
    offsetMs: number,
    creativeName: string,
    serviceName: string,
    timeWindow: string,
    upfrontDue: string | null, // set when the client still has to pay upfront
    balanceDue: string | null, // set when upfront is paid but the balance isn't
) {
    const mins = Math.max(Math.round(-offsetMs / MIN), 1);
    const when =
        stage === 1
            ? "tomorrow"
            : stage === 2
              ? "in about an hour"
              : `in about ${mins} minute${mins === 1 ? "" : "s"}`;
    const booking = `your booking with ${creativeName} for "${serviceName}"`;

    if (upfrontDue) {
        return {
            title: "Pay your upfront to keep your booking",
            body: `${booking[0].toUpperCase()}${booking.slice(1)} is ${when}. Pay your upfront ${upfrontDue} to secure it. Unpaid bookings are cancelled when they start.`,
        };
    }

    if (balanceDue) {
        return {
            title:
                stage === 4
                    ? "Pay now to keep your booking"
                    : "Pay your balance before your appointment",
            body:
                stage === 4
                    ? `Your appointment with ${creativeName} for "${serviceName}" is starting and the remaining ${balanceDue} is unpaid. Pay now or the booking is flagged for review.`
                    : `${booking[0].toUpperCase()}${booking.slice(1)} is ${when}. Pay the remaining ${balanceDue} so ${creativeName} can start. Unpaid bookings are flagged for review shortly after the start time.`,
        };
    }

    return {
        title:
            stage === 1
                ? "Your booking is tomorrow"
                : stage === 2
                  ? "Your booking is coming up"
                  : "Starting soon",
        body:
            stage === 1
                ? `Reminder: ${booking} is tomorrow (${timeWindow}).`
                : `${booking[0].toUpperCase()}${booking.slice(1)} starts ${when}. Get ready!`,
    };
}

// ── Start reminders: +5 and +15 min after the booked start ────────
export const sendStartReminders = internalMutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();

        const [paid, confirmed] = await Promise.all([
            ctx.db
                .query("bookings")
                .withIndex("by_status", q => q.eq("status", "PAID"))
                .collect(),
            ctx.db
                .query("bookings")
                .withIndex("by_status", q => q.eq("status", "CONFIRMED"))
                .collect(),
        ]);

        for (const booking of [...paid, ...confirmed]) {
            if (booking.paymentPhase !== "FULLY_SETTLED") continue;

            const startMs = bookingStartToUtcMs(
                booking.dateBooked,
                booking.startTime,
                booking.clientTimezone ?? "UTC",
            );
            const offsetMs = now - startMs;
            const stage = booking.startReminderStage ?? 0;
            const dueStage = dueStageFor(offsetMs);

            if (dueStage === null) continue;

            // Nothing due yet, but an earlier run sent some: the booking
            // was rescheduled later, so re-arm the whole ladder
            if (dueStage === 0) {
                if (stage > 0) {
                    await ctx.db.patch(booking._id, { startReminderStage: 0 });
                }
                continue;
            }

            // Rescheduled to a later time but still inside the window: restart
            const sentStage = dueStage < stage ? 0 : stage;
            if (dueStage <= sentStage) continue;

            await ctx.db.patch(booking._id, { startReminderStage: dueStage });
            const info = await getBookingContext(ctx, booking);
            const copy = startReminderCopy(
                dueStage,
                offsetMs,
                info.clientName,
                info.serviceName,
            );

            await sendNotification(ctx, {
                userId: booking.creativeId,
                title: copy.title,
                body: copy.body,
                type: "BOOKING",
                meta: { screen: "booking_detail", id: booking._id },
            });
        }
    },
});

// ── Final payment reminders + 24h flag ────────────────────────────
export const processFinalPayments = internalMutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();

        const awaitingFinal = await ctx.db
            .query("bookings")
            .withIndex("by_paymentPhase", q =>
                q.eq("paymentPhase", "FINAL_PENDING"),
            )
            .collect();

        for (const booking of awaitingFinal) {
            if (booking.status !== "COMPLETED" || booking.paymentFlaggedAt) {
                continue;
            }

            const since = booking.completedAt ?? booking.updatedAt;
            const elapsed = now - since;
            const due = `$${(booking.remainingDueAmount / 100).toFixed(2)}`;

            // 24h unpaid: flag once, then stop reminding
            if (elapsed >= PAYMENT_FLAG_AFTER_MS) {
                await ctx.db.patch(booking._id, {
                    paymentFlaggedAt: now,
                    updatedAt: now,
                });
                const info = await getBookingContext(ctx, booking);

                await sendNotification(ctx, {
                    userId: booking.clientId,
                    title: "Payment Overdue",
                    body: `Your final payment of ${due} for "${info.serviceName}" is 24 hours overdue. Please pay now to avoid restrictions on your account.`,
                    type: "BOOKING",
                    meta: {
                        screen: "booking_detail",
                        id: booking._id,
                        action: "PAY_FINAL",
                    },
                });

                await sendNotification(ctx, {
                    userId: booking.creativeId,
                    title: "Client Payment Overdue",
                    body: `${info.clientName} hasn't paid the final ${due} for "${info.serviceName}". We've flagged it for review.`,
                    type: "BOOKING",
                    meta: { screen: "booking_detail", id: booking._id },
                });

                await ctx.scheduler.runAfter(
                    0,
                    internal.lib.appActions.notifications
                        .sendTelegramNotification,
                    {
                        text: [
                            `🚩 FINAL PAYMENT OVERDUE (24h)`,
                            ``,
                            `📋 Order:    ${booking.orderNo}`,
                            `🎨 Creative: ${info.creativeName}`,
                            `👤 Client:   ${info.clientName}`,
                            `🛠 Service:  ${info.serviceName}`,
                            `💰 Unpaid:   ${due}`,
                            ``,
                            `🔧 Flagged for admin review.`,
                        ].join("\n"),
                        category: "PAYMENTS",
                    },
                );
                continue;
            }

            // Every 30 min for the first 2h, then every 3h
            const last = booking.lastPaymentReminderAt ?? since;
            const every =
                elapsed < PAYMENT_FAST_WINDOW_MS
                    ? PAYMENT_FAST_EVERY_MS
                    : PAYMENT_SLOW_EVERY_MS;

            if (now - last < every) continue;

            await ctx.db.patch(booking._id, { lastPaymentReminderAt: now });
            const info = await getBookingContext(ctx, booking);

            await sendNotification(ctx, {
                userId: booking.clientId,
                title: "Final Payment Due",
                body: `Please complete your final payment of ${due} for "${info.serviceName}".`,
                type: "BOOKING",
                meta: {
                    screen: "booking_detail",
                    id: booking._id,
                    action: "PAY_FINAL",
                },
            });
        }
    },
});

// ── Client reminders: 24h, 1h and 15 min before the start ─────────
export const sendClientReminders = internalMutation({
    args: {},
    handler: async ctx => {
        const now = Date.now();

        const [paid, confirmed] = await Promise.all([
            ctx.db
                .query("bookings")
                .withIndex("by_status", q => q.eq("status", "PAID"))
                .collect(),
            ctx.db
                .query("bookings")
                .withIndex("by_status", q => q.eq("status", "CONFIRMED"))
                .collect(),
        ]);

        for (const booking of [...paid, ...confirmed]) {
            const upfrontPending =
                booking.status === "CONFIRMED" &&
                booking.paymentPhase === "UPFRONT_PENDING";
            const balanceDue =
                booking.status === "PAID" &&
                booking.paymentPhase === "UPFRONT_PAID";
            const fullyPaid = booking.paymentPhase === "FULLY_SETTLED";
            if (!upfrontPending && !balanceDue && !fullyPaid) continue;
            const startMs = bookingStartToUtcMs(
                booking.dateBooked,
                booking.startTime,
                booking.clientTimezone ?? "UTC",
            );
            const offsetMs = now - startMs;
            const stage = booking.clientReminderStage ?? 0;
            const due = clientDueStage(offsetMs);

            if (due === null) continue;
            // "Pay now" stage only matters while the balance is unpaid
            if (due.stage === 4 && !balanceDue) continue;
            // Nothing due yet: if an earlier run sent some, the booking was
            // rescheduled later, so re-arm the ladder
            if (due.stage === 0) {
                if (stage > 0) {
                    await ctx.db.patch(booking._id, { clientReminderStage: 0 });
                }
                continue;
            }

            const sentStage = due.stage < stage ? 0 : stage;
            if (due.stage <= sentStage) continue;

            await ctx.db.patch(booking._id, { clientReminderStage: due.stage });

            // Stage was already long past when we first saw it: skip the push
            if (due.crossedAgoMs > CLIENT_SEND_WINDOW_MS) continue;

            const info = await getBookingContext(ctx, booking);
            const copy = clientReminderCopy(
                due.stage,
                offsetMs,
                info.creativeName,
                info.serviceName,
                info.timeWindow,
                upfrontPending
                    ? `$${(booking.upfrontChargeAmount / 100).toFixed(2)}`
                    : null,
                balanceDue
                    ? `$${(booking.remainingDueAmount / 100).toFixed(2)}`
                    : null,
            );

            await sendNotification(ctx, {
                userId: booking.clientId,
                title: copy.title,
                body: copy.body,
                type: "BOOKING",
                meta: {
                    screen: "booking_detail",
                    id: booking._id,
                    ...(upfrontPending ? { action: "PAY_UPFRONT" } : {}),
                    ...(balanceDue ? { action: "PAY_FINAL" } : {}),
                },
            });
        }
    },
});
