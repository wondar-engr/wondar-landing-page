import { DeleteAccountForm } from "@/components/landing/delete-account-form";
import { DeletionInfo } from "@/components/landing/deletion-info";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Delete your Wondar account",
    description: "Request deletion of your Wondar App account and data.",
};

export default function DeleteAccountPage() {
    return (
        <main className="min-h-screen bg-white">
            <section className="pt-32 pb-12 px-4 text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold text-slate mb-4">
                    Delete your Wondar App account
                </h1>
                <p className="text-lg text-slate/60">
                    Enter the email address on your account and we&apos;ll start
                    the deletion process.
                </p>
            </section>
            <DeleteAccountForm />
            <DeletionInfo />
        </main>
    );
}
