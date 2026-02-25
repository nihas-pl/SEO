import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardMobileHeader } from "./dashboard-mobile-header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getSessionFromCookies();

    if (!session) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
            id: true,
            name: true,
            username: true,
            email: true,
        },
    });

    if (!user) {
        redirect("/login");
    }

    const membership = await prisma.workspaceMember.findFirst({
        where: { userId: user.id },
        include: { workspace: true },
        orderBy: { createdAt: 'asc' },
    });

    const workspace = membership?.workspace || null;

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex selection:bg-indigo-500/30">
            <DashboardSidebar user={user} workspace={workspace} />

            <div className="flex-1 flex flex-col min-w-0">
                <DashboardMobileHeader />
                <main className="flex-1 overflow-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
