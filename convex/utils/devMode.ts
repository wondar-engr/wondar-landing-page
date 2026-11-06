/**
 * Keeps a development deployment from contacting real people.
 *
 * Set EMAIL_REDIRECT_TO on the dev deployment only (for example
 * you@gmail.com). From then on:
 *  - every email goes to that address instead of the real recipient, as
 *    you+<original-address>@gmail.com so you can still tell them apart
 *    (addresses in DEV_EMAIL_ALLOWLIST, comma separated, are left alone),
 *  - subjects start with "[DEV → original]",
 *  - Telegram messages start with "[DEV]",
 *  - the Big Ten daily crons do nothing (the scripts still work).
 * Production never sets it, so nothing changes there.
 */

export function emailRedirectTarget(): string | null {
    return process.env.EMAIL_REDIRECT_TO?.trim() || null;
}

export function isDevDeployment(): boolean {
    return emailRedirectTarget() !== null;
}

function allowlist(): Set<string> {
    return new Set(
        (process.env.DEV_EMAIL_ALLOWLIST ?? "")
            .split(",")
            .map(e => e.trim().toLowerCase())
            .filter(Boolean),
    );
}

function redirectAddress(original: string, target: string): string | null {
    const email = original.trim().toLowerCase();
    if (allowlist().has(email)) return null;

    const [local, domain] = target.split("@");
    if (!local || !domain) return target;
    if (local.includes("+")) return target;

    const tag = email.replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    return `${local}+${tag}@${domain}`;
}

type Outgoing = { to: string | string[]; subject?: string };

/** Rewrites the recipient and subject of one outgoing email, in dev only. */
export function redirectEmailPayload<T extends Outgoing>(payload: T): T {
    const target = emailRedirectTarget();
    if (!target) return payload;

    const originals = Array.isArray(payload.to) ? payload.to : [payload.to];
    const redirected = originals.map(o => redirectAddress(o, target) ?? o);
    const changed = redirected.some((r, i) => r !== originals[i]);
    if (!changed) return payload;

    return {
        ...payload,
        to: Array.isArray(payload.to) ? redirected : redirected[0],
        subject: `[DEV → ${originals.join(", ")}] ${payload.subject ?? ""}`,
    };
}

/** Wraps the Resend component so every sendEmail call goes through the guard. */
export function withDevRedirect<
    T extends { sendEmail: (ctx: never, options: never) => unknown },
>(resend: T): T {
    return new Proxy(resend, {
        get(target, prop) {
            const value = Reflect.get(target, prop, target);
            if (prop === "sendEmail") {
                return (ctx: never, options: Outgoing, ...rest: never[]) =>
                    (
                        target.sendEmail as unknown as (
                            ...args: unknown[]
                        ) => unknown
                    )(ctx, redirectEmailPayload(options), ...rest);
            }
            return typeof value === "function" ? value.bind(target) : value;
        },
    });
}
