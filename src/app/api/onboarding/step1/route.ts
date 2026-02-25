import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/server/services/user-workspace';
import { discoverKeywords } from '@/server/services/content-engine';

export async function POST(request: Request) {
    try {
        const { user, workspace } = await getAuthenticatedUser(request);
        const { url, industry } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // 1. Update the Workspace with the domain and industry
        await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
                domain: url,
                industry: industry || "General",
            }
        });

        // 2. Discover Keywords using the Content Engine (combines OpenAI & DataForSEO)
        // We run this to populate the board with initial data
        const discovered = await discoverKeywords({
            businessNiche: industry || "Technology",
            websiteUrl: url,
            companyName: workspace.name
        });

        if (discovered.length > 0) {
            // Save them to DB if empty
            const existingCount = await prisma.discoveredKeyword.count({ where: { workspaceId: workspace.id } });

            if (existingCount === 0) {
                await prisma.discoveredKeyword.createMany({
                    data: discovered.map(kw => ({
                        workspaceId: workspace.id,
                        keyword: kw.keyword,
                        monthlyVolume: kw.monthlyVolume,
                        difficulty: kw.difficulty,
                        opportunityScore: kw.opportunityScore,
                        intent: kw.intent,
                        suggestedTitle: kw.suggestedTitle,
                        category: kw.category,
                        niche: industry || "Technology",
                        websiteUrl: url
                    })),
                    skipDuplicates: true
                });
            }
        }

        // 3. Create an initial Content Plan for the current month if none exists
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const existingPlan = await prisma.contentPlan.findFirst({
            where: {
                workspaceId: workspace.id,
                month: { gte: startOfMonth }
            }
        });

        if (!existingPlan) {
            await prisma.contentPlan.create({
                data: {
                    workspaceId: workspace.id,
                    month: startOfMonth,
                    status: 'ACTIVE'
                }
            });
        }

        return NextResponse.json({ success: true, message: "Workspace analyzed and Content Plan generated." });
    } catch (error: any) {
        console.error('[ONBOARDING] Step 1 Error:', error);
        return NextResponse.json({ error: 'Failed to process Step 1' }, { status: 500 });
    }
}
