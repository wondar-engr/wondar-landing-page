// Helper to calculate distance between two points
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Helper to calculate bounding box from center point and radius
export function getBoundingBox(lat: number, lng: number, radiusMiles: number) {
    // Approximate degrees per mile
    const latDegPerMile = 1 / 69;
    const lngDegPerMile = 1 / (69 * Math.cos((lat * Math.PI) / 180));

    return {
        minLat: lat - radiusMiles * latDegPerMile,
        maxLat: lat + radiusMiles * latDegPerMile,
        minLng: lng - radiusMiles * lngDegPerMile,
        maxLng: lng + radiusMiles * lngDegPerMile,
    };
}

// In your query
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
