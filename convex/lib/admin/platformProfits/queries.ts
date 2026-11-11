import { v } from "convex/values";
import { query } from "@convex/_generated/server";
import { ProfitSourceUnion, ProfitStatusUnion } from "@convex/unions";
import { requireAccessProfile } from "@convex/utils/helpers/auth";

// What Wondar itself earns: the client and creative fee rows written when a
// payment succeeds (see stripe/ledger.ts). Super admins only.

export const summary = query({
  args: {},
  handler: async (ctx) => {
    await requireAccessProfile(ctx, "platformProfits");

    const profits = await ctx.db.query("platformProfits").collect();
    const recognized = profits.filter((p) => p.status === "RECOGNIZED");
    const sum = (rows: typeof profits) =>
      rows.reduce((total, p) => total + p.amount, 0);

    // Stripe's processing fee, where we've been able to record it
    const transactions = await ctx.db.query("transactions").collect();
    const withFee = transactions.filter(
      (t) => t.status === "SUCCEEDED" && (t.stripeFee ?? 0) > 0,
    );

    // Last six months, oldest first
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1),
      );
      return {
        key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
        label: d.toLocaleString("en-US", {
          month: "short",
          timeZone: "UTC",
        }),
        amount: 0,
      };
    });
    for (const p of recognized) {
      const d = new Date(p.recognizedAt ?? p._creationTime);
      const slot = months.find(
        (m) => m.key === `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
      );
      if (slot) slot.amount += p.amount;
    }

    return {
      totalEarned: sum(recognized),
      clientFees: sum(recognized.filter((p) => p.source === "CLIENT_FEE")),
      creativeFees: sum(recognized.filter((p) => p.source === "CREATIVE_FEE")),
      reversed: sum(profits.filter((p) => p.status === "REVERSED")),
      pending: sum(profits.filter((p) => p.status === "PENDING")),
      stripeFees: withFee.reduce((total, t) => total + (t.stripeFee ?? 0), 0),
      stripeFeeCoverage: withFee.length,
      paymentCount: new Set(recognized.map((p) => p.transactionId)).size,
      months: months.map(({ label, amount }) => ({ label, amount })),
    };
  },
});

export const list = query({
  args: {
    status: v.optional(ProfitStatusUnion),
    source: v.optional(ProfitSourceUnion),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, source, limit }) => {
    await requireAccessProfile(ctx, "platformProfits");

    const base = status
      ? ctx.db
          .query("platformProfits")
          .withIndex("by_status", (q) => q.eq("status", status))
      : source
        ? ctx.db
            .query("platformProfits")
            .withIndex("by_source", (q) => q.eq("source", source))
        : ctx.db.query("platformProfits");

    const rows = (await base.order("desc").take(limit ?? 100)).filter(
      (p) =>
        (!status || p.status === status) && (!source || p.source === source),
    );

    return await Promise.all(
      rows.map(async (p) => {
        const booking = await ctx.db.get(p.bookingId);
        const transaction = await ctx.db.get(p.transactionId);
        return {
          _id: p._id,
          _creationTime: p._creationTime,
          source: p.source,
          amount: p.amount,
          status: p.status,
          recognizedAt: p.recognizedAt ?? null,
          note: p.note ?? null,
          orderNo: booking?.orderNo ?? null,
          transactionId: p.transactionId,
          totalCharged: transaction?.totalCharged ?? null,
          stripeFee: transaction?.stripeFee ?? null,
        };
      }),
    );
  },
});
