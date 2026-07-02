import { Doc } from "@convex/_generated/dataModel";
import { QueryCtx } from "@convex/_generated/server";

export function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export function formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

// ── Helper: enrich a booking with profile + service data ─────────
export async function enrichBooking(ctx: QueryCtx, booking: Doc<"bookings">) {
    const [service, clientProfile, creativeProfile, creativeProfile2] =
        await Promise.all([
            ctx.db.get(booking.serviceId),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", booking.clientId))
                .first(),
            ctx.db
                .query("profiles")
                .withIndex("by_userId", q => q.eq("userId", booking.creativeId))
                .first(),
            ctx.db
                .query("creativeProfiles")
                .withIndex("by_userId", q => q.eq("userId", booking.creativeId))
                .first(),
        ]);

    const category = service?.categoryId
        ? await ctx.db.get(service.categoryId)
        : null;

    return {
        ...booking,
        service: service
            ? {
                  name: service.name,
                  banners: service.banners,
                  duration: service.duration,
                  category: category,
              }
            : null,
        client: clientProfile
            ? {
                  firstName: clientProfile.firstName,
                  lastName: clientProfile.lastName,
                  avatar: clientProfile.avatar,
                  email: clientProfile.email,
                  phoneNumber: clientProfile.phoneNumber,
              }
            : null,
        creative: creativeProfile
            ? {
                  firstName: creativeProfile.firstName,
                  lastName: creativeProfile.lastName,
                  avatar: creativeProfile.avatar,
                  email: creativeProfile.email,
                  businessName: creativeProfile2?.businessName ?? null,
                  phoneNumber: creativeProfile.phoneNumber,
              }
            : null,
    };
}
