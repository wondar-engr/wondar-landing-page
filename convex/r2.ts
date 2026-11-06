// convex/r2.ts
"use node"; // This must run in a Node environment
import { action } from "./_generated/server";
import { v } from "convex/values";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const getR2Client = () => {
    return new S3Client({
        region: "auto",
        endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
        },
    });
};

export const getUploadUrl = action({
    args: {
        fileName: v.string(),
        contentType: v.string(),
        folder: v.optional(v.string()), // Add this if you want to support folders in R2, e.g., "avatars/", "products/", etc.
    },
    handler: async (ctx, args) => {
        const r2 = getR2Client();
        const folderPath = args.folder ? `${args.folder}/` : "";
        const key = `${folderPath}${args.fileName}`;
        const command = new PutObjectCommand({
            Bucket: "wondar-bucket",
            Key: key,
            ContentType: args.contentType,
        });

        // Valid for 60 seconds
        const url = await getSignedUrl(r2, command, { expiresIn: 60 });
        return url;
    },
});

// Image upload for the website contact form, where nobody is signed in.
// Fixed folder, images only, random file name.
const REPORT_IMAGE_TYPES: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
};

export const getReportImageUploadUrl = action({
    args: { contentType: v.string() },
    handler: async (_ctx, { contentType }) => {
        const ext = REPORT_IMAGE_TYPES[contentType];
        if (!ext) throw new Error("Only PNG, JPG or WebP images are allowed.");

        const key = `feedback-web/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
        const command = new PutObjectCommand({
            Bucket: "wondar-bucket",
            Key: key,
            ContentType: contentType,
        });
        const uploadUrl = await getSignedUrl(getR2Client(), command, {
            expiresIn: 60,
        });

        return { uploadUrl, key };
    },
});
