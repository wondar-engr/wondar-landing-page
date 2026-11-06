/**
 * Who can open what in the admin dashboard.
 *
 * This is the one place to change access. To let regular admins into a page,
 * add "ADMIN" to its list; to lock one down, take it out. The sidebar, the
 * route guard and the Convex functions behind each page all read this map.
 */
export type AppRole = "USER" | "ADMIN" | "SUPER_ADMIN";

const ADMINS: readonly AppRole[] = ["ADMIN", "SUPER_ADMIN"];
const SUPER_ONLY: readonly AppRole[] = ["SUPER_ADMIN"];

export const ACCESS = {
    overview: ADMINS,
    users: ADMINS,
    services: ADMINS,
    bookings: ADMINS,
    feedback: ADMINS,
    bigTen: ADMINS,
    messages: ADMINS,

    // Money, platform configuration and role management
    payments: SUPER_ONLY,
    platformProfits: SUPER_ONLY,
    settings: SUPER_ONLY,
    serviceCategories: SUPER_ONLY,
    roles: SUPER_ONLY,
} as const satisfies Record<string, readonly AppRole[]>;

export type AccessArea = keyof typeof ACCESS;

export const ROLE_LABELS: Record<AppRole, string> = {
    USER: "User",
    ADMIN: "Admin",
    SUPER_ADMIN: "Super Admin",
};

export function isAdminRole(role: string | undefined | null): boolean {
    return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function hasAccess(
    role: string | undefined | null,
    area: AccessArea,
): boolean {
    return (ACCESS[area] as readonly string[]).includes(role ?? "");
}

// Dashboard routes and the area each one belongs to. Longest prefix wins.
const ROUTE_AREAS: [string, AccessArea][] = [
    ["/dashboard/service-categories", "serviceCategories"],
    ["/dashboard/payments", "payments"],
    ["/dashboard/platform-profits", "platformProfits"],
    ["/dashboard/settings", "settings"],
    ["/dashboard/users", "users"],
    ["/dashboard/services", "services"],
    ["/dashboard/bookings", "bookings"],
    ["/dashboard/feedback", "feedback"],
    ["/dashboard/big-ten", "bigTen"],
    ["/dashboard/messages", "messages"],
];

export function areaForPath(pathname: string): AccessArea {
    const match = ROUTE_AREAS.find(
        ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    return match ? match[1] : "overview";
}
