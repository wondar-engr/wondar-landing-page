import { QueryCtx } from "../../_generated/server";
import { Doc } from "../../_generated/dataModel";

const OPEN_STATUSES = ["open", "reviewed"];

// The part of a tester's picture that comes from the real app, matched by the
// email they were invited with
export async function loadAppStatus(
    ctx: QueryCtx,
    tester: Doc<"bigTenTesters">,
) {
    const profile = await ctx.db
        .query("profiles")
        .withIndex("by_email", q => q.eq("email", tester.email))
        .first();

    // By email so reports added by an admin or sent from the website count too
    const reports = await ctx.db
        .query("feedbackReports")
        .withIndex("by_email", q => q.eq("email", tester.email))
        .collect();
    const reportCount = reports.length;
    const openReportCount = reports.filter(r =>
        OPEN_STATUSES.includes(r.status),
    ).length;

    if (!profile) {
        return {
            profileId: null,
            accountCreated: false,
            lastSeen: null,
            onboarded: false,
            services: [] as { name: string; serviceFee: number }[],
            reportCount,
            openReportCount,
        };
    }

    const services =
        tester.role === "CREATIVE"
            ? (
                  await ctx.db
                      .query("services")
                      .filter(q => q.eq(q.field("userId"), profile.userId))
                      .collect()
              )
                  .filter(s => s.status === "ACTIVE" && !s.deleteStatus)
                  .map(s => ({ name: s.name, serviceFee: s.serviceFee }))
            : [];

    const onboarded =
        profile.onboarding.profileComplete &&
        (tester.role === "CREATIVE"
            ? profile.onboarding.creativeComplete
            : profile.onboarding.clientComplete);

    return {
        profileId: profile._id,
        accountCreated: true,
        lastSeen: profile.lastSeen ?? null,
        onboarded,
        services,
        reportCount,
        openReportCount,
    };
}
