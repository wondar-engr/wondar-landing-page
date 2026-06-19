import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { notFound } from "next/navigation";
import { CreativeProfileClient } from "./_components/creative-profile-client";
import type { Metadata } from "next";

interface Props {
    params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { userId } = await params;
    const profile = await fetchQuery(
        api.lib.public.publicFns.getPublicCreativeProfile,
        { userId },
    );

    if (!profile) {
        return { title: "Creative Not Found | Wondar" };
    }

    return {
        title: `${profile.businessName} | Wondar`,
        description:
            profile.aboutMe?.slice(0, 160) ??
            `Book ${profile.businessName} on Wondar`,
        openGraph: {
            title: `${profile.businessName} on Wondar`,
            description: profile.aboutMe?.slice(0, 160) ?? "",
            images: profile.coverImage ? [profile.coverImage] : [],
            type: "profile",
        },
        twitter: {
            card: "summary_large_image",
            title: `${profile.businessName} on Wondar`,
            description: profile.aboutMe?.slice(0, 160) ?? "",
            images: profile.coverImage ? [profile.coverImage] : [],
        },
    };
}

export default async function CreativeProfilePage({ params }: Props) {
    const { userId } = await params;
    const profile = await fetchQuery(
        api.lib.public.publicFns.getPublicCreativeProfile,
        { userId },
    );

    if (!profile) notFound();

    return <CreativeProfileClient profile={profile} userId={userId} />;
}
