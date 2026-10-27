import { ConvexError } from "convex/values";
export function throwAppError(message: string): never {
    throw new ConvexError(message);
}
