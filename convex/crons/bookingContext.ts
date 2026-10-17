import { MutationCtx } from "../_generated/server";
import { Id } from "@convex/_generated/dataModel";
import { formatBookingDate, formatBookingTimeWindow } from "@convex/utils/time";

export async function getBookingContext(
    ctx: MutationCtx,
    booking: {
        clientId: string;
        creativeId: string;
        serviceId: Id<"services">;
        dateBooked: number;
        startTime: number;
        endTime: number;
        clientTimezone: string;
    },
) {
    const [clientProfile, creativeProfile, service] = await Promise.all([
        ctx.db
            .query("profiles")
            .withIndex("by_userId", q => q.eq("userId", booking.clientId))
            .first(),
        ctx.db
            .query("creativeProfiles")
            .withIndex("by_userId", q => q.eq("userId", booking.creativeId))
            .first(),
        ctx.db.get(booking.serviceId),
    ]);

    const clientName = clientProfile
        ? `${clientProfile.firstName ?? ""} ${clientProfile.lastName ?? ""}`.trim()
        : `Client (${booking.clientId.slice(-6)})`;

    const creativeName =
        creativeProfile?.businessName ??
        `Creative (${booking.creativeId.slice(-6)})`;

    const serviceName = service?.name ?? "Unknown Service";

    const clientTimezone = booking.clientTimezone ?? "UTC";
    const serviceDate = formatBookingDate(booking.dateBooked);
    const timeWindow = formatBookingTimeWindow(
        booking.startTime,
        booking.endTime,
        clientTimezone,
    );

    return {
        clientName,
        creativeName,
        serviceName,
        serviceDate,
        timeWindow,
        creativeProfile,
    };
}
