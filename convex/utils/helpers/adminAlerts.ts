import { Doc, Id } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import { MutationCtx } from "../../_generated/server";

/**
 * Alerts for the admin team: a Telegram message in the admin group
 * (TG_ADMIN_CHAT_ID, falls back to the general group) and, when something is
 * assigned, an email to the person it was assigned to.
 */

const adminBase = () =>
  (process.env.SITE_URL ?? "https://admin.wondarapp.com").replace(/\/$/, "");

export const adminUrl = (path: string) => `${adminBase()}${path}`;

export const profileName = (
  p: Pick<Doc<"profiles">, "firstName" | "lastName" | "email">,
) => `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.email;

export async function alertAdmins(ctx: MutationCtx, lines: string[]) {
  await ctx.scheduler.runAfter(
    0,
    internal.lib.appActions.notifications.sendTelegramNotification,
    { text: lines.join("\n"), category: "ADMIN" },
  );
}

/**
 * Call when an owner is set. Does nothing if the owner didn't change.
 * Emails the new owner (not when they assigned it to themselves) and posts to
 * the admin group.
 */
export async function notifyAssigned(
  ctx: MutationCtx,
  {
    previousOwnerId,
    ownerId,
    actor,
    kind,
    title,
    path,
  }: {
    previousOwnerId?: Id<"profiles">;
    ownerId?: Id<"profiles"> | null;
    actor: Doc<"profiles">;
    kind: string; // "feedback report", "Big Ten tester", "website message"
    title: string;
    path: string;
  },
) {
  if (!ownerId || ownerId === previousOwnerId) return;

  const owner = await ctx.db.get(ownerId);
  if (!owner) return;

  const url = adminUrl(path);

  if (owner._id !== actor._id) {
    await ctx.scheduler.runAfter(0, internal.email.sendAssigned, {
      email: owner.email,
      firstName: owner.firstName,
      assignedBy: profileName(actor),
      kind,
      title,
      url,
    });
  }

  await alertAdmins(ctx, [
    `📌 ASSIGNED: ${kind}`,
    ``,
    `${title}`,
    `👤 To:   ${profileName(owner)}`,
    `✍️ By:   ${profileName(actor)}`,
    `🔗 ${url}`,
  ]);
}
