import { action } from "./_generated/server";
import { v } from "convex/values";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_AUTOCOMPLETE_URL =
    "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const PLACES_DETAILS_URL =
    "https://maps.googleapis.com/maps/api/place/details/json";

interface GooglePrediction {
    place_id: string;
    description: string;
    structured_formatting: {
        main_text: string;
        secondary_text: string;
    };
}

interface GooglePlaceDetails {
    result: {
        formatted_address: string;
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
        };
        address_components: Array<{
            long_name: string;
            short_name: string;
            types: string[];
        }>;
    };
}

// Search for places based on input text
export const searchPlaces = action({
    args: {
        query: v.string(),
        origin: v.optional(
            v.object({
                lat: v.number(),
                lng: v.number(),
            }),
        ),
        radius: v.optional(v.number()), // in meters
        countryRestriction: v.optional(v.string()), // e.g., "us"
    },
    handler: async (_ctx, args) => {
        const {
            query,
            origin,
            radius = 50000,
            countryRestriction = "us",
        } = args;

        if (!query || query.length < 3) {
            return [];
        }

        try {
            let url = `${PLACES_AUTOCOMPLETE_URL}?input=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;

            // Add location bias if origin provided
            if (origin) {
                url += `&location=${origin.lat},${origin.lng}&radius=${radius}`;
            }

            // Restrict to country
            if (countryRestriction) {
                url += `&components=country:${countryRestriction}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
                console.error(
                    "Places API error:",
                    data.status,
                    data.error_message,
                );
                return [];
            }

            const predictions: GooglePrediction[] = data.predictions || [];

            return predictions.map(prediction => ({
                placeId: prediction.place_id,
                description: prediction.description,
                mainText: prediction.structured_formatting.main_text,
                secondaryText: prediction.structured_formatting.secondary_text,
            }));
        } catch (error) {
            console.error("Search places error:", error);
            return [];
        }
    },
});

// Get detailed location info from place ID
export const getPlaceDetails = action({
    args: {
        placeId: v.string(),
    },
    handler: async (_ctx, args) => {
        const { placeId } = args;

        try {
            const url = `${PLACES_DETAILS_URL}?place_id=${placeId}&fields=formatted_address,geometry,address_components&key=${GOOGLE_PLACES_API_KEY}`;

            const response = await fetch(url);
            const data: GooglePlaceDetails = await response.json();

            if (!data.result) {
                return null;
            }

            const { result } = data;
            const addressComponents = result.address_components;

            // Extract address parts
            const getComponent = (types: string[]): string => {
                const component = addressComponents.find(c =>
                    types.some(type => c.types.includes(type)),
                );
                return component?.long_name || "";
            };

            const getComponentShort = (types: string[]): string => {
                const component = addressComponents.find(c =>
                    types.some(type => c.types.includes(type)),
                );
                return component?.short_name || "";
            };

            const streetNumber = getComponent(["street_number"]);
            const route = getComponent(["route"]);
            const city = getComponent([
                "locality",
                "sublocality",
                "administrative_area_level_2",
            ]);
            const state = getComponentShort(["administrative_area_level_1"]);
            const zipCode = getComponent(["postal_code"]);

            return {
                address: `${streetNumber} ${route}`.trim(),
                city,
                state,
                zipCode,
                lat: result.geometry.location.lat,
                lng: result.geometry.location.lng,
                placeId,
                formattedAddress: result.formatted_address,
            };
        } catch (error) {
            console.error("Get place details error:", error);
            return null;
        }
    },
});
