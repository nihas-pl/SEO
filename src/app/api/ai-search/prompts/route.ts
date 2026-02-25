import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/services/user-workspace';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);

        // Fetch all prompts for this workspace along with their newest evaluation
        const prompts = await prisma.aiPrompt.findMany({
            where: {
                workspaceId: workspace.id,
            },
            include: {
                evaluations: {
                    orderBy: { evaluatedAt: 'desc' },
                    take: 1
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ prompts });

    } catch (error: any) {
        console.error('[AI Prompts API] Failed to fetch prompts:', error);
        return NextResponse.json({ error: 'Failed to fetch tracked prompts' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);
        const { prompt, category } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const newPrompt = await prisma.aiPrompt.create({
            data: {
                workspaceId: workspace.id,
                prompt: prompt,
                targetBrand: workspace.name,
                category: category || "General",
            }
        });

        return NextResponse.json({ success: true, prompt: newPrompt });

    } catch (error: any) {
        console.error('[AI Prompts API] Failed to add prompt:', error);
        return NextResponse.json({ error: 'Failed to add prompt' }, { status: 500 });
    }
}
