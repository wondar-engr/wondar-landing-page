import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";
import { sendNotification } from "../../notifications";
import { internal } from "@convex/_generated/api";
import { formatDate, formatTime } from "@convex/utils/helpers/bookings";

const DISPUTE_WINDOW_MS = 48 * 60 * 60 * 1000;

export const openDispute = mutation({
    args: {
        bookingId: v.id("bookings"),
        reason: v.string(),
    },
    handler: async (ctx, { bookingId, reason }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");

        const isClient = booking.clientId === userId;
        const isCreative = booking.creativeId === userId;
        if (!isClient && !isCreative) throw new Error("Not authorized");

        if (booking.status === "DISPUTE") {
            throw new Error("This booking already has an open dispute");
        }

        const openedBy = isClient ? "CLIENT" : "CREATIVE";
        const now = Date.now();

        if (isClient) {
            if (booking.status !== "COMPLETED") {
                throw new Error(
                    "Disputes can only be opened on completed bookings",
                );
            }
            if (
                booking.completedAt &&
                now > booking.completedAt + DISPUTE_WINDOW_MS
            ) {
                throw new Error(
                    "Dispute window has closed (48 hours after completion)",
                );
            }
        }

        if (isCreative) {
            if (
                booking.status !== "IN_PROGRESS" &&
                booking.status !== "COMPLETED"
            ) {
                throw new Error(
                    "Disputes can only be opened during or after a service",
                );
            }
            if (
                booking.status === "COMPLETED" &&
                booking.completedAt &&
                now > booking.completedAt + DISPUTE_WINDOW_MS
            ) {
                throw new Error(
                    "Dispute window has closed (48 hours after completion)",
                );
            }
        }

        await ctx.db.patch(bookingId, {
            status: "DISPUTE",
            disputeReason: reason,
            disputeOpenedAt: now,
            disputeOpenedBy: openedBy,
            updatedAt: now,
        });

        // ── Fetch context ─────────────────────────────────────────
        const [clientProfile, creativeProfile, service] = await Promise.all([
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", booking.clientId))
                .first(),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", booking.creativeId))
                .first(),
            ctx.db.get(booking.serviceId),
        ]);

        const clientName = clientProfile
            ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
            : `Client (${booking.clientId.slice(-6)})`;

        const creativeName = creativeProfile
            ? `${creativeProfile.firstName ?? ""} ${creativeProfile.lastName ?? ""}`.trim()
            : `Creative (${booking.creativeId.slice(-6)})`;

        const serviceName = service?.name ?? "Unknown Service";
        const serviceDate = formatDate(booking.dateBooked);
        const timeWindow = `${formatTime(booking.startTime)} → ${formatTime(booking.endTime)}`;
        const openedByName = isClient ? clientName : creativeName;

        // ── Notify the other party ────────────────────────────────
        const notifyUserId = isClient ? booking.creativeId : booking.clientId;
        await sendNotification(ctx, {
            userId: notifyUserId,
            title: "Dispute Opened",
            body: "A dispute has been opened on your booking. Please submit your account within 48 hours.",
            type: "BOOKING",
            meta: { screen: "booking_dispute", id: bookingId },
        });

        // ── Telegram → DISPUTES ───────────────────────────────────
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `🚨 DISPUTE OPENED`,
                    ``,
                    `📋 Order No:   ${booking.orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `🎨 Creative:   ${creativeName}`,
                    `👤 Client:     ${clientName}`,
                    `🛠 Service:    ${serviceName}`,
                    `📅 Date:       ${serviceDate}`,
                    `🕐 Time:       ${timeWindow}`,
                    ``,
                    `⚖️ Opened By:  ${openedByName} (${openedBy})`,
                    `📝 Reason:     ${reason}`,
                    `💰 Payment Phase: ${booking.paymentPhase}`,
                    ``,
                    `⏱ Both parties have 48hrs to submit statements.`,
                    `🔧 Monitor and resolve within 48hrs.`,
                ].join("\n"),
                category: "DISPUTES",
            },
        );

        return { success: true };
    },
});

export const submitDisputeStatement = mutation({
    args: {
        bookingId: v.id("bookings"),
        text: v.string(),
        evidence: v.array(v.string()),
    },
    handler: async (ctx, { bookingId, text, evidence }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");
        if (booking.status !== "DISPUTE") {
            throw new Error("No active dispute on this booking");
        }

        const isClient = booking.clientId === userId;
        const isCreative = booking.creativeId === userId;
        if (!isClient && !isCreative) throw new Error("Not authorized");

        if (evidence.length > 2)
            throw new Error("Maximum 2 evidence files allowed");
        if (!text.trim()) throw new Error("Statement cannot be empty");

        const role = isClient ? "client" : "creative";
        const existing = booking.disputeSubmissions?.[role];
        if (existing)
            throw new Error("You have already submitted your statement");

        const now = Date.now();
        const currentSubmissions = booking.disputeSubmissions || {};

        await ctx.db.patch(bookingId, {
            disputeSubmissions: {
                ...currentSubmissions,
                [role]: { text: text.trim(), evidence, submittedAt: now },
            },
            updatedAt: now,
        });

        // ── Fetch context ─────────────────────────────────────────
        const [clientProfile, creativeProfile, service] = await Promise.all([
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", booking.clientId))
                .first(),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", booking.creativeId))
                .first(),
            ctx.db.get(booking.serviceId),
        ]);

        const clientName = clientProfile
            ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
            : `Client (${booking.clientId.slice(-6)})`;

        const creativeName = creativeProfile
            ? `${creativeProfile.firstName ?? ""} ${creativeProfile.lastName ?? ""}`.trim()
            : `Creative (${booking.creativeId.slice(-6)})`;

        const serviceName = service?.name ?? "Unknown Service";
        const submitterName = isClient ? clientName : creativeName;
        const otherRole = isClient ? "creative" : "client";
        const otherSubmission = currentSubmissions[otherRole];
        const bothSubmitted = !!otherSubmission;

        // ── Notify other party ────────────────────────────────────
        const notifyUserId = isClient ? booking.creativeId : booking.clientId;
        await sendNotification(ctx, {
            userId: notifyUserId,
            title: "Dispute Update",
            body: `The ${role} has submitted their statement. Please submit yours if you haven't.`,
            type: "BOOKING",
            meta: { screen: "booking_dispute", id: bookingId },
        });

        // ── Telegram → DISPUTES ───────────────────────────────────
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    bothSubmitted
                        ? `✅ DISPUTE — Both Statements Submitted`
                        : `📝 DISPUTE — Statement Submitted`,
                    ``,
                    `📋 Order No:   ${booking.orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `🎨 Creative:   ${creativeName}`,
                    `👤 Client:     ${clientName}`,
                    `🛠 Service:    ${serviceName}`,
                    ``,
                    `🗣 Submitted By: ${submitterName} (${role.toUpperCase()})`,
                    `📎 Evidence:     ${evidence.length} file${evidence.length !== 1 ? "s" : ""}`,
                    ``,
                    bothSubmitted
                        ? `🔧 Both parties have submitted. Ready for admin review.`
                        : `⏳ Waiting on ${otherRole} to submit their statement.`,
                ].join("\n"),
                category: "DISPUTES",
            },
        );

        return { success: true };
    },
});
