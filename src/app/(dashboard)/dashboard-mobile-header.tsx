import Link from "next/link";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardMobileHeader() {
    return (
        <header className="h-16 border-b bg-white dark:bg-neutral-900 flex items-center justify-between px-4 md:hidden flex-shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-indigo-600 focus:outline-none" />
                <span className="text-xl font-bold tracking-tight">AutoRank.ai</span>
            </Link>
            <Button variant="ghost" size="icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
            </Button>
        </header>
    );
}
