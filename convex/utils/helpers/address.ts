import { Doc } from "@convex/_generated/dataModel";

export interface PublicWorkAddress {
    address?: string;
    zipCode?: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
    isExact: boolean;
}

// Rounding to 2 decimals puts the pin in a ~1 km grid. It is deterministic,
// so repeated queries can't be averaged back to the real spot.
const approx = (n: number) => Math.round(n * 100) / 100;

export function publicWorkAddress(
    profile: Pick<Doc<"creativeProfiles">, "workAddress" | "showExactAddress">,
): PublicWorkAddress {
    const a = profile.workAddress;
    if (profile.showExactAddress) return { ...a, isExact: true };

    return {
        city: a.city,
        state: a.state,
        lat: approx(a.lat),
        lng: approx(a.lng),
        isExact: false,
    };
}
