import { mutation, query, QueryCtx } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";
import { sendNotification } from "../../notifications";
import { BookingStatusUnion } from "../../../../convex/unions";
import {
    formatCents,
    formatDate,
    formatTime,
} from "@convex/utils/helpers/bookings";
import { internal } from "@convex/_generated/api";

// ==========================================
// HELPERS
// ==========================================

async function generateOrderNo(ctx: QueryCtx): Promise<string> {
    const bookings = await ctx.db.query("bookings").collect();
    const nextNum = bookings.length + 1001;
    return `WND-${nextNum}`;
}

async function getConfigNumber(ctx: QueryCtx, key: string, fallback: number) {
    const row = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", q => q.eq("key", key))
        .unique();

    const n = Number(row?.value);
    return Number.isFinite(n) ? n : fallback;
}

// ==========================================
// CREATE BOOKING
// ==========================================

export const createBooking = mutation({
    args: {
        creativeId: v.string(),
        serviceId: v.id("services"),
        dateBooked: v.number(),
        startTime: v.number(),
        note: v.optional(v.string()),
        clientTimezone: v.string(), // IANA timezone from device
    },
    handler: async (ctx, args) => {
        const clientId = await getAuthUserId(ctx);
        if (!clientId) throw new Error("Not authenticated");

        const service = await ctx.db.get(args.serviceId);
        if (!service) throw new Error("Service not found");

        if (service.userId !== args.creativeId) {
            throw new Error("Service does not belong to this creative");
        }

        // Calculate fees
        const serviceFee = service.serviceFee;
        const bookingFee = service.bookingFee;
        const endTime = args.startTime + service.duration;

        if (!Number.isInteger(serviceFee) || serviceFee <= 0) {
            throw new Error("Invalid service fee");
        }
        if (!Number.isInteger(bookingFee) || bookingFee < 0) {
            throw new Error("Invalid booking fee");
        }

        // Pull live config, then snapshot into booking
        const clientFeePercent = await getConfigNumber(
            ctx,
            "platform_fee_percent_client",
            5,
        );
        const creativeFeePercent = await getConfigNumber(
            ctx,
            "platform_fee_percent_creative",
            15,
        );
        const minBookingPercent = await getConfigNumber(
            ctx,
            "booking_fee_percent_min",
            20,
        );
        const maxBookingPercent = await getConfigNumber(
            ctx,
            "booking_fee_percent_max",
            50,
        );
        const currencyCfg = await ctx.db
            .query("systemConfig")
            .withIndex("by_key", q => q.eq("key", "default_currency"))
            .unique();

        const currency = String(currencyCfg?.value ?? "usd").toLowerCase();

        // Validate booking fee against configured band
        const minBookingFee = Math.ceil((serviceFee * minBookingPercent) / 100);
        const maxBookingFee = Math.floor(
            (serviceFee * maxBookingPercent) / 100,
        );

        if (bookingFee < minBookingFee || bookingFee > maxBookingFee) {
            throw new Error(
                `Booking fee must be between ${minBookingPercent}% and ${maxBookingPercent}% of service fee.`,
            );
        }
        const platformClientFeeAmount = Math.round(
            (serviceFee * clientFeePercent) / 100,
        );
        const platformCreativeFeeAmount = Math.round(
            (serviceFee * creativeFeePercent) / 100,
        );

        const upfrontChargeAmount = bookingFee + platformClientFeeAmount; // paid after acceptance
        const remainingDueAmount = Math.max(serviceFee - bookingFee, 0);

        const orderNo = await generateOrderNo(ctx);

        const bookingId = await ctx.db.insert("bookings", {
            orderNo,
            clientId,
            creativeId: args.creativeId,
            serviceId: args.serviceId,
            dateBooked: args.dateBooked,
            startTime: args.startTime,
            endTime,
            status: "PENDING",
            clientTimezone: args.clientTimezone, // snapshot at time of booking

            // Snapshot pricing
            currency,
            serviceFee,
            bookingFee,
            tax: 0,
            proposedTotal: serviceFee, // total service value, not “pay now”

            platformClientFeePercent: clientFeePercent,
            platformCreativeFeePercent: creativeFeePercent,
            platformClientFeeAmount,
            platformCreativeFeeAmount,

            upfrontChargeAmount,
            remainingDueAmount,
            paymentPhase: "NONE",

            note: args.note,
            jobCompletionDocs: [],
            updatedAt: Date.now(),

            // Rescheduling details
            rescheduleStatus: "NONE",
            rescheduleCount: 0,
            rescheduleHistory: [],
        });

        // ── Fetch names for notifications ─────────────────────────
        const [clientProfile, creativeProfile] = await Promise.all([
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", clientId))
                .first(),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", args.creativeId))
                .first(),
        ]);

        const clientName = clientProfile
            ? `${clientProfile.firstName || ""} ${clientProfile.lastName || ""}`.trim()
            : "A client";

        const creativeName = creativeProfile
            ? `${creativeProfile.firstName ?? ""} ${creativeProfile.lastName ?? ""}`.trim()
            : `Creative (${args.creativeId.slice(-6)})`;

        const serviceDate = formatDate(args.dateBooked);
        const timeWindow = `${formatTime(args.startTime)} → ${formatTime(endTime)}`;

        // Notify creative
        await sendNotification(ctx, {
            userId: args.creativeId,
            title: "New Booking Request! 📅",
            body: `${clientName} wants to book ${service.name}.`,
            type: "BOOKING",
            meta: { screen: "booking_detail", id: bookingId },
            metaUser: clientId,
        });

        // ── Telegram → BOOKINGS ───────────────────────────────────
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `📅 NEW BOOKING REQUEST`,
                    ``,
                    `📋 Order No:   ${orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `🎨 Creative:   ${creativeName}`,
                    `👤 Client:     ${clientName}`,
                    `🛠 Service:    ${service.name}`,
                    `📅 Date:       ${serviceDate}`,
                    `🕐 Time:       ${timeWindow}`,
                    ``,
                    `💰 Pricing Breakdown`,
                    `   Service Fee:     ${formatCents(serviceFee)}`,
                    `   Booking Fee:     ${formatCents(bookingFee)}`,
                    `   Platform Fee:    ${formatCents(platformClientFeeAmount)} (client ${clientFeePercent}%)`,
                    `   Due Now:         ${formatCents(upfrontChargeAmount)}`,
                    `   Due After:       ${formatCents(remainingDueAmount)}`,
                    ``,
                    args.note ? `📝 Note: ${args.note}` : null,
                    `ℹ️ Awaiting creative acceptance.`,
                ]
                    .filter(Boolean)
                    .join("\n"),
                category: "BOOKINGS",
            },
        );

        return {
            bookingId,
            orderNo,
            currency,
            serviceFee,
            bookingFee,
            platformClientFeeAmount,
            dueNow: upfrontChargeAmount,
            dueAfterCompletion: remainingDueAmount,
        };
    },
});

// ==========================================
// GET BOOKING BY ID
// ==========================================

export const getBookingById = query({
    args: {
        bookingId: v.id("bookings"),
    },
    handler: async (ctx, { bookingId }) => {
        const booking = await ctx.db.get(bookingId);
        if (!booking) return null;

        const service = await ctx.db.get(booking.serviceId);

        const creativeProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", booking.creativeId))
            .first();

        const creative = await ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", booking.creativeId))
            .first();

        const clientProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", booking.clientId))
            .first();

        return {
            ...booking,
            service: service
                ? {
                      name: service.name,
                      duration: service.duration,
                      banners: service.banners,
                  }
                : null,
            creative: creativeProfile
                ? {
                      firstName: creativeProfile.firstName,
                      lastName: creativeProfile.lastName,
                      avatar: creativeProfile.avatar,
                      businessName: creative?.businessName,
                  }
                : null,
            client: clientProfile
                ? {
                      firstName: clientProfile.firstName,
                      lastName: clientProfile.lastName,
                      avatar: clientProfile.avatar,
                  }
                : null,
        };
    },
});

// ==========================================
// GET CLIENT BOOKINGS
// ==========================================

export const getClientBookings = query({
    args: {
        status: v.optional(BookingStatusUnion),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { status, limit = 20 }) => {
        const clientId = await getAuthUserId(ctx);
        if (!clientId) return [];

        let bookings = await ctx.db
            .query("bookings")
            .withIndex("by_client", q => q.eq("clientId", clientId))
            .order("desc")
            .take(limit * 2);

        if (status) {
            bookings = bookings.filter(b => b.status === status);
        }

        const enriched = await Promise.all(
            bookings.slice(0, limit).map(async booking => {
                const service = await ctx.db.get(booking.serviceId);
                const creativeProfile = await ctx.db
                    .query("profiles")
                    .withIndex("by_userId", q =>
                        q.eq("userId", booking.creativeId),
                    )
                    .first();

                return {
                    ...booking,
                    service: service
                        ? { name: service.name, banners: service.banners }
                        : null,
                    creative: creativeProfile
                        ? {
                              firstName: creativeProfile.firstName,
                              lastName: creativeProfile.lastName,
                              avatar: creativeProfile.avatar,
                          }
                        : null,
                };
            }),
        );

        return enriched;
    },
});

// ==========================================
// GET AVAILABLE TIME SLOTS
// ==========================================

export const getAvailableTimeSlots = query({
    args: {
        creativeId: v.string(),
        serviceId: v.id("services"),
        dateBooked: v.number(),
        dayOfWeek: v.number(), // 0-6, sent from frontend
    },
    handler: async (ctx, { creativeId, serviceId, dateBooked, dayOfWeek }) => {
        const service = await ctx.db.get(serviceId);
        if (!service) return [];

        // Use the dayOfWeek sent from frontend (already in client's timezone)
        const dayAvailability = service.availability?.find(
            a => a.day === dayOfWeek && a.selected,
        );

        if (!dayAvailability) return [];

        // Get existing bookings for this day
        const existingBookings = await ctx.db
            .query("bookings")
            .withIndex("by_creative", q => q.eq("creativeId", creativeId))
            .filter(q =>
                q.and(
                    q.eq(q.field("dateBooked"), dateBooked),
                    q.neq(q.field("status"), "CANCELLED"),
                ),
            )
            .collect();

        const duration = service.duration;
        const buffer = service.bufferTime || 0;
        const slotInterval = duration + buffer;

        const slots: { start: number; end: number; booked: boolean }[] = [];

        let currentTime = dayAvailability.start;
        while (currentTime + duration <= dayAvailability.end) {
            const slotStart = currentTime;
            const slotEnd = currentTime + duration;

            // Only check if booked - let frontend handle "past time" logic
            const isBooked = existingBookings.some(
                booking =>
                    slotStart < booking.endTime && slotEnd > booking.startTime,
            );

            slots.push({
                start: slotStart,
                end: slotEnd,
                booked: isBooked,
            });

            currentTime += slotInterval;
        }

        return slots;
    },
});

// ==========================================
// CANCEL BOOKING
// ==========================================

export const cancelBooking = mutation({
    args: {
        bookingId: v.id("bookings"),
        reason: v.string(),
    },
    handler: async (ctx, { bookingId, reason }) => {
        const clientId = await getAuthUserId(ctx);
        if (!clientId) throw new Error("Not authenticated");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");

        if (booking.clientId !== clientId) throw new Error("Not authorized");

        if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
            throw new Error("Cannot cancel this booking");
        }

        await ctx.db.patch(bookingId, {
            status: "CANCELLED",
            cancel: { by: clientId, reason, date: Date.now() },
            updatedAt: Date.now(),
        });

        // ── Fetch context ─────────────────────────────────────────
        const [clientProfile, creativeProfile, service] = await Promise.all([
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", clientId))
                .first(),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", booking.creativeId))
                .first(),
            ctx.db.get(booking.serviceId),
        ]);

        const clientName = clientProfile
            ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
            : `Client (${clientId.slice(-6)})`;

        const creativeName = creativeProfile
            ? `${creativeProfile.firstName ?? ""} ${creativeProfile.lastName ?? ""}`.trim()
            : `Creative (${booking.creativeId.slice(-6)})`;

        const serviceName = service?.name ?? "Unknown Service";
        const serviceDate = formatDate(booking.dateBooked);
        const timeWindow = `${formatTime(booking.startTime)} → ${formatTime(booking.endTime)}`;

        await sendNotification(ctx, {
            userId: booking.creativeId,
            title: "Booking Cancelled",
            body: `${clientName} cancelled their booking.`,
            type: "BOOKING",
            meta: { screen: "booking_detail", id: bookingId },
            metaUser: clientId,
        });

        // ── Telegram → BOOKINGS ───────────────────────────────────
        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: [
                    `❌ BOOKING CANCELLED — By Client`,
                    ``,
                    `📋 Order No:   ${booking.orderNo}`,
                    `🆔 Booking ID: ${bookingId}`,
                    `🎨 Creative:   ${creativeName}`,
                    `👤 Client:     ${clientName}`,
                    `🛠 Service:    ${serviceName}`,
                    `📅 Date:       ${serviceDate}`,
                    `🕐 Time:       ${timeWindow}`,
                    ``,
                    `📝 Reason: ${reason}`,
                    ``,
                    `💰 Payment Phase: ${booking.paymentPhase}`,
                    booking.paymentPhase === "UPFRONT_PAID"
                        ? `⚠️ Client already paid upfront. Review refund eligibility.`
                        : `ℹ️ No payment was taken.`,
                ]
                    .filter(Boolean)
                    .join("\n"),
                category: "BOOKINGS",
            },
        );

        return { success: true };
    },
});
