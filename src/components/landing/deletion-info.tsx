export function DeletionInfo() {
    return (
        <section className="pb-24 px-4">
            <div className="max-w-lg mx-auto space-y-6 text-slate/70 text-sm leading-6">
                <div>
                    <h2 className="font-semibold text-slate mb-1">
                        How it works
                    </h2>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>
                            Submit the email address on your Wondar App account.
                        </li>
                        <li>You&apos;ll get a confirmation email.</li>
                        <li>
                            We verify the request and delete your account within
                            30 days.
                        </li>
                    </ol>
                </div>
                <div>
                    <h2 className="font-semibold text-slate mb-1">
                        What is deleted
                    </h2>
                    <p>
                        Your profile, photos, posts, messages, reviews,
                        preferences and push notification tokens.
                    </p>
                </div>
                <div>
                    <h2 className="font-semibold text-slate mb-1">
                        What we keep
                    </h2>
                    <p>
                        Payment and transaction records are retained as required
                        by financial and tax regulations, and dispute records as
                        needed to resolve open disputes. They are not used for
                        any other purpose.
                    </p>
                </div>
            </div>
        </section>
    );
}
