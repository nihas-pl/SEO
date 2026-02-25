"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Zap, LayoutDashboard, FileText, Bot, ListChecks,
    MessageSquare, Settings, LogOut
} from "lucide-react";

export function DashboardSidebar({ user, workspace }: { user: any, workspace: any }) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
    };

    const initials = (user.name || user.username)
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <aside className="w-64 border-r bg-white dark:bg-neutral-900 hidden md:flex flex-col flex-shrink-0">
            <div className="h-16 flex items-center px-6 border-b">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <Zap className="h-6 w-6 text-indigo-600 focus:outline-none" />
                    <span className="text-xl font-bold tracking-tight">AutoRank.ai</span>
                </Link>
            </div>

            {/* Workspace Switcher */}
            <div className="px-4 py-4 border-b">
                <Button variant="outline" className="w-full justify-between active:scale-[0.98] transition-all">
                    <span className="truncate flex-1 text-left">{workspace?.name || "My Workspace"}</span>
                </Button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" active={pathname === "/dashboard"} />

                <div className="pt-4 pb-2">
                    <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Content Engine</p>
                </div>
                <NavItem href="/content/plan" icon={<FileText size={20} />} label="30-Day Plan" active={pathname === "/content/plan"} />
                <NavItem href="/content/articles" icon={<ListChecks size={20} />} label="All Articles" active={pathname === "/content/articles"} />

                <div className="pt-4 pb-2">
                    <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Growth Tools</p>
                </div>
                {/* <NavItem href="/backlinks" icon={<LinkIcon size={20} />} label="Backlinks" active={pathname === "/backlinks"} /> */}
                <NavItem href="/ai-search" icon={<Bot size={20} />} label="AI Visibility Tracking" active={pathname === "/ai-search"} />
                <NavItem href="/audit" icon={<ListChecks size={20} />} label="SEO Audit" active={pathname === "/audit"} />
                <NavItem href="/reddit" icon={<MessageSquare size={20} />} label="Reddit Agent" active={pathname === "/reddit"} />

                <div className="pt-4 pb-2">
                    <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Settings</p>
                </div>
                <NavItem href="/settings/integrations" icon={<Settings size={20} />} label="Integrations" active={pathname.startsWith("/settings/integrations")} />
                <NavItem href="/cms" icon={<Settings size={20} />} label="CMS Connection" active={pathname === "/cms"} />
            </nav>

            <div className="p-4 border-t">
                <div className="flex items-center gap-3 p-2">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start truncate text-sm flex-1">
                        <span className="font-medium truncate">{user.name || user.username}</span>
                        <span className="text-neutral-500 truncate text-xs">{user.email}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        title="Sign out"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}

function NavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <Link href={href}>
            <span className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${active ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-50'}`}>
                {icon}
                {label}
            </span>
        </Link>
    );
}
