import Link from "next/link";

export default function CreativeNotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="text-center max-w-sm">
                <div className="w-16 h-16 bg-forest-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎨</span>
                </div>
                <h1 className="text-xl font-bold text-slate mb-2">
                    Profile not found
                </h1>
                <p className="text-slate/60 text-sm mb-6">
                    This creative profile doesn&apos;t exist or is no longer
                    active.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 bg-forest-green text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-forest-green/90 transition-colors"
                >
                    Discover Wondar
                </Link>
            </div>
        </div>
    );
}
