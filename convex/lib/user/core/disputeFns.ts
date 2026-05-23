import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../../../auth";
import { sendNotification } from "../../notifications";
import { internal } from "@convex/_generated/api";

const DISPUTE_WINDOW_MS = 48 * 60 * 60 * 1000; // 48hrs post-completion

export const openDispute = mutation({
    args: {
        bookingId: v.id("bookings"),
        reason: v.string(), // free text reason
    },
    handler: async (ctx, { bookingId, reason }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const booking = await ctx.db.get(bookingId);
        if (!booking) throw new Error("Booking not found");

        const isClient = booking.clientId === userId;
        const isCreative = booking.creativeId === userId;
        if (!isClient && !isCreative) throw new Error("Not authorized");

        // Already in dispute
        if (booking.status === "DISPUTE") {
            throw new Error("This booking already has an open dispute");
        }

        const openedBy = isClient ? "CLIENT" : "CREATIVE";
        const now = Date.now();

        // Client can open: COMPLETED within 48hrs
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

        // Creative can open: IN_PROGRESS or COMPLETED within 48hrs
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

        const notifyUserId = isClient ? booking.creativeId : booking.clientId;
        await sendNotification(ctx, {
            userId: notifyUserId,
            title: "Dispute Opened",
            body: `A dispute has been opened on your booking. Please submit your account within 48 hours.`,
            type: "BOOKING",
            meta: { screen: "booking_dispute", id: bookingId },
        });

        await ctx.scheduler.runAfter(
            0,
            internal.lib.appActions.notifications.sendTelegramNotification,
            {
                text: `🚨 Dispute opened\nBooking: ${bookingId}\nBy: ${openedBy}\nReason: ${reason}`,
            },
        );

        return { success: true };
    },
});

export const submitDisputeStatement = mutation({
    args: {
        bookingId: v.id("bookings"),
        text: v.string(),
        evidence: v.array(v.string()), // max 2 storage URLs
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

        if (evidence.length > 2) {
            throw new Error("Maximum 2 evidence files allowed");
        }

        if (!text.trim()) throw new Error("Statement cannot be empty");

        const role = isClient ? "client" : "creative";
        const existing = booking.disputeSubmissions?.[role];
        if (existing) {
            throw new Error("You have already submitted your statement");
        }

        const now = Date.now();
        const currentSubmissions = booking.disputeSubmissions || {};

        await ctx.db.patch(bookingId, {
            disputeSubmissions: {
                ...currentSubmissions,
                [role]: {
                    text: text.trim(),
                    evidence,
                    submittedAt: now,
                },
            },
            updatedAt: now,
        });

        // Notify the other party
        const notifyUserId = isClient ? booking.creativeId : booking.clientId;
        await sendNotification(ctx, {
            userId: notifyUserId,
            title: "Dispute Update",
            body: `The ${role} has submitted their statement. Please submit yours if you haven't.`,
            type: "BOOKING",
            meta: { screen: "booking_dispute", id: bookingId },
        });

        // If both have submitted, notify admin
        const otherRole = isClient ? "creative" : "client";
        const otherSubmission = currentSubmissions[otherRole];
        if (otherSubmission) {
            await ctx.scheduler.runAfter(
                0,
                internal.lib.appActions.notifications.sendTelegramNotification,
                {
                    text: `✅ Both parties submitted\nBooking: ${bookingId}\nReady for review.`,
                },
            );
        }

        return { success: true };
    },
});
