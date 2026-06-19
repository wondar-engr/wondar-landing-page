"use client";

import { X, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AppStoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    creativeName: string;
}

export function AppStoreModal({
    isOpen,
    onClose,
    creativeName,
}: AppStoreModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 300,
                        }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl pointer-events-auto">
                            {/* Close */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                            >
                                <X className="w-4 h-4 text-slate" />
                            </button>

                            {/* Icon */}
                            <div className="w-16 h-16 bg-forest-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Smartphone className="w-8 h-8 text-forest-green" />
                            </div>

                            <h3 className="text-xl font-bold text-slate text-center mb-2">
                                Get the Wondar App
                            </h3>
                            <p className="text-slate/60 text-sm text-center mb-6">
                                Book {creativeName} and thousands of other
                                creatives near you.
                            </p>

                            {/* Store Buttons */}
                            <div className="space-y-3">
                                {/* App Store */}
                                {/* DEV: Update href with real App Store URL once published */}
                                <a
                                    href="https://apps.apple.com/app/wondar"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 bg-slate text-white px-5 py-4 rounded-2xl hover:bg-slate/90 transition-colors"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="w-7 h-7 fill-white shrink-0"
                                    >
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                    </svg>
                                    <div>
                                        <p className="text-xs text-white/60">
                                            Download on the
                                        </p>
                                        <p className="text-base font-semibold leading-tight">
                                            App Store
                                        </p>
                                    </div>
                                </a>

                                {/* Play Store */}
                                {/* DEV: Update href with real Play Store URL once published */}
                                <a
                                    href="https://play.google.com/store/apps/details?id=com.wondarapp.wondarnew"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 bg-slate text-white px-5 py-4 rounded-2xl hover:bg-slate/90 transition-colors"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="w-7 h-7 fill-white shrink-0"
                                    >
                                        <path d="M3.18 23.76c.35.19.75.19 1.1-.01l11.54-6.59-2.64-2.64-10 9.24zm-1.8-20.1C1.14 4 1 4.5 1 5.14v13.72c0 .64.14 1.14.38 1.48l.07.07 7.69-7.69v-.18L1.45 3.59l-.07.07zM19.37 9.09l-2.25-1.28-2.93 2.93 2.93 2.93 2.28-1.3c.65-.37.65-1.91-.03-2.28zM3.18.24l10 9.24L10.54 12l-2.64-2.64L3.18.24C2.83.04 2.43.04 2.08.24c-.34.2-.58.58-.58 1.02v.04c0 .1.01.19.04.29" />
                                    </svg>
                                    <div>
                                        <p className="text-xs text-white/60">
                                            Get it on
                                        </p>
                                        <p className="text-base font-semibold leading-tight">
                                            Google Play
                                        </p>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
