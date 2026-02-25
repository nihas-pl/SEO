import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/server/services/user-workspace';

export async function POST(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);
        const { networkOptIn } = await request.json();

        // Mark onboarding as complete and save the network opt-in preference
        await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
                onboardingCompleted: true,
                networkOptIn: typeof networkOptIn === "boolean" ? networkOptIn : true,
            }
        });

        return NextResponse.json({ success: true, message: "Onboarding complete. Redirecting to dashboard." });
    } catch (error: any) {
        console.error('[ONBOARDING] Complete Error:', error);
        return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
    }
}
