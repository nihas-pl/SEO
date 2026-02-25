import Link from "next/link";
import { Zap } from "lucide-react";

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 selection:bg-indigo-500/30 flex flex-col font-sans">
            {/* Minimalist Topbar */}
            <header className="w-full border-b bg-white/80 dark:bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-950/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <Zap className="h-6 w-6" />
                        <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">AutoRank.ai</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative w-full items-center">
                {children}
            </main>
        </div>
    );
}
