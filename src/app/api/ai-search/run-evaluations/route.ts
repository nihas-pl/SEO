import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/services/user-workspace';
import prisma from '@/lib/prisma';
import { evaluateAIPrompt } from '@/server/services/ai-evaluator';

export const maxDuration = 60; // Allow for up to 60 seconds

export async function POST(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);

        // Fetch all prompts for this workspace
        const prompts = await prisma.aIPrompt.findMany({
            where: {
                workspaceId: workspace.id,
            }
        });

        if (prompts.length === 0) {
            return NextResponse.json({ message: 'No prompts found to evaluate. Check your Tracking List.', promptsScanned: 0 });
        }

        // Run evaluations concurrently (or sequentially if rate limits are a concern)
        // For standard setups, Promise.all is fine for a few prompts.
        const results = await Promise.allSettled(
            prompts.map(prompt => evaluateAIPrompt(prompt.id))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return NextResponse.json({
            success: true,
            message: `Evaluated ${successful} prompts. Failed: ${failed}.`
        });

    } catch (error: any) {
        console.error('[Run AI Evaluations API] Failed:', error);
        return NextResponse.json({ error: 'Failed to run evaluations' }, { status: 500 });
    }
}
