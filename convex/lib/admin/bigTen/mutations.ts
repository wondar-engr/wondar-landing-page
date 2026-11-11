import { v } from "convex/values";
import { mutation } from "@convex/_generated/server";
import { internal } from "@convex/_generated/api";
import { requireAccessProfile } from "@convex/utils/helpers/auth";
import { throwAppError } from "@convex/utils/helpers/error";
import { sendNotification } from "../../notifications";
import {
  adminUrl,
  alertAdmins,
  notifyAssigned,
  profileName,
} from "@convex/utils/helpers/adminAlerts";

const testerName = (t: { firstName: string; lastName?: string }) =>
  `${t.firstName}${t.lastName ? ` ${t.lastName}` : ""}`;
const testerLink = (id: string) => adminUrl(`/dashboard/big-ten/${id}`);

const resultValidator = v.union(
  v.literal("PENDING"),
  v.literal("PASS"),
  v.literal("FAIL"),
);

export const updateTester = mutation({
  args: {
    id: v.id("bigTenTesters"),
    confirmed: v.optional(v.boolean()),
    readyToTest: v.optional(v.boolean()),
    remindersMuted: v.optional(v.boolean()),
    ownerId: v.optional(v.union(v.id("profiles"), v.null())),
    resultNotes: v.optional(v.string()),
    results: v.optional(
      v.object({
        registration: v.optional(resultValidator),
        access: v.optional(resultValidator),
        core: v.optional(resultValidator),
        navigation: v.optional(resultValidator),
      }),
    ),
  },
  handler: async (ctx, { id, results, ownerId, ...fields }) => {
    const admin = await requireAccessProfile(ctx, "bigTen");

    const tester = await ctx.db.get(id);
    if (!tester) throwAppError("Tester not found.");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }
    if (ownerId !== undefined) patch.ownerId = ownerId ?? undefined;

    if (results) {
      const merged = { ...tester.results };
      for (const [key, value] of Object.entries(results)) {
        if (value !== undefined) {
          merged[key as keyof typeof merged] = value;
        }
      }
      patch.results = merged;
      patch.testedAt = Date.now();
    }

    await ctx.db.patch(id, patch);

    // What actually changed, for the admin group
    const changes: string[] = [];
    const label: Record<string, string> = {
      confirmed: "Confirmed",
      readyToTest: "Ready to test",
      remindersMuted: "Reminders muted",
    };
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      const before = (tester as Record<string, unknown>)[key];
      if (key === "resultNotes") {
        if ((before ?? "") !== value) changes.push("Result notes edited");
      } else if (before !== value) {
        changes.push(`${label[key] ?? key}: ${before ?? "—"} → ${value}`);
      }
    }
    if (results) {
      for (const [key, value] of Object.entries(results)) {
        const before = tester.results[key as keyof typeof tester.results];
        if (value !== undefined && before !== value)
          changes.push(`${key}: ${before ?? "PENDING"} → ${value}`);
      }
    }
    if (ownerId === null && tester.ownerId) changes.push("Owner removed");

    if (changes.length > 0) {
      await alertAdmins(ctx, [
        `🧪 BIG TEN UPDATED: ${testerName(tester)}`,
        ``,
        ...changes,
        `✍️ By: ${profileName(admin)}`,
        `🔗 ${testerLink(id)}`,
      ]);
    }

    await notifyAssigned(ctx, {
      previousOwnerId: tester.ownerId,
      ownerId,
      actor: admin,
      kind: "Big Ten tester",
      title: testerName(tester),
      path: `/dashboard/big-ten/${id}`,
    });

    return { success: true };
  },
});

const MAX_SUBJECT = 150;
const MAX_BODY = 4000;

// Email and/or push notification to one tester, typed in the admin
export const sendMessage = mutation({
  args: {
    testerId: v.id("bigTenTesters"),
    subject: v.string(),
    body: v.string(),
    email: v.boolean(),
    push: v.boolean(),
  },
  handler: async (ctx, { testerId, subject, body, email, push }) => {
    const admin = await requireAccessProfile(ctx, "bigTen");

    const tester = await ctx.db.get(testerId);
    if (!tester) throwAppError("Tester not found.");

    const cleanSubject = subject.trim();
    const cleanBody = body.trim();
    if (!cleanSubject) throwAppError("Add a subject.");
    if (!cleanBody) throwAppError("Write a message first.");
    if (cleanSubject.length > MAX_SUBJECT)
      throwAppError(`Subject can be up to ${MAX_SUBJECT} characters.`);
    if (cleanBody.length > MAX_BODY)
      throwAppError(`Messages can be up to ${MAX_BODY} characters.`);
    if (!email && !push) throwAppError("Choose email, push, or both.");

    let emailQueued = false;
    let pushSent = false;
    let pushNote: string | null = null;

    if (email) {
      await ctx.scheduler.runAfter(0, internal.email.sendBigTenMessage, {
        email: tester.email,
        firstName: tester.firstName,
        subject: cleanSubject,
        body: cleanBody,
      });
      emailQueued = true;
      await ctx.db.insert("bigTenMessages", {
        testerId,
        kind: "MANUAL",
        channel: "EMAIL",
        subject: cleanSubject,
        body: cleanBody,
        sentBy: admin._id,
      });
    }

    if (push) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_email", (q) => q.eq("email", tester.email))
        .first();

      if (!profile) {
        pushNote = "They haven't signed up yet, so there's no app to notify.";
      } else {
        const result = await sendNotification(ctx, {
          userId: profile.userId,
          title: cleanSubject,
          body: cleanBody,
          type: "GENERAL",
        });
        pushSent = result.pushSent;
        if (!pushSent) {
          pushNote =
            "It's in their in-app notifications, but no push went out (no device registered or notifications are off).";
        }
        await ctx.db.insert("bigTenMessages", {
          testerId,
          kind: "MANUAL",
          channel: "PUSH",
          subject: cleanSubject,
          body: cleanBody,
          sentBy: admin._id,
        });
      }
    }

    await alertAdmins(ctx, [
      `📣 BIG TEN MESSAGE to ${testerName(tester)} (${[email && "email", push && "push"].filter(Boolean).join(" + ")})`,
      ``,
      `📌 ${cleanSubject}`,
      `✍️ By: ${profileName(admin)}`,
      ...(push && !pushSent
        ? [`⚠️ No push went out (no device or push off)`]
        : []),
      `🔗 ${testerLink(testerId)}`,
    ]);

    return { emailQueued, pushSent, pushNote };
  },
});

// Send (or resend) one of the two onboarding emails from the tester's page
export const sendOnboardingEmail = mutation({
  args: {
    testerId: v.id("bigTenTesters"),
    kind: v.union(v.literal("WELCOME"), v.literal("GUIDE")),
  },
  handler: async (ctx, { testerId, kind }) => {
    const admin = await requireAccessProfile(ctx, "bigTen");

    const tester = await ctx.db.get(testerId);
    if (!tester) throwAppError("Tester not found.");

    const args = { email: tester.email, firstName: tester.firstName };
    if (kind === "WELCOME") {
      await ctx.scheduler.runAfter(0, internal.email.sendBigTenWelcome, args);
    } else {
      if (
        !(
          process.env.BIG_TEN_GUIDE_PDF_URL ??
          process.env.BETA_TEST_GUIDE_PDF_URL
        )
      ) {
        throwAppError("BIG_TEN_GUIDE_PDF_URL is not set.");
      }
      await ctx.scheduler.runAfter(0, internal.email.sendBigTenGuide, args);
    }

    const now = Date.now();
    await ctx.db.patch(testerId, {
      [kind === "WELCOME" ? "welcomeSentAt" : "guideSentAt"]: now,
      updatedAt: now,
    });
    await ctx.db.insert("bigTenMessages", {
      testerId,
      kind,
      channel: "EMAIL",
      subject:
        kind === "WELCOME"
          ? "Welcome to the Wondar Big Ten 🎉"
          : "Your Wondar Big Ten starter guide",
      body: kind === "WELCOME" ? "Welcome email" : "Starter guide email",
      sentBy: admin._id,
    });

    await alertAdmins(ctx, [
      `📧 BIG TEN ${kind} EMAIL sent to ${testerName(tester)}`,
      `✍️ By: ${profileName(admin)}`,
      `🔗 ${testerLink(testerId)}`,
    ]);

    return { success: true };
  },
});
