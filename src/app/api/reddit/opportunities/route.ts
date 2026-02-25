import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/services/user-workspace';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);

        const opportunities = await prisma.redditOpportunity.findMany({
            where: {
                workspaceId: workspace.id,
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50 // Keep dashboard fast, limit to recent leads
        });

        // We also need some aggregated stats for the top cards
        const since24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const newLeads = await prisma.redditOpportunity.count({
            where: {
                workspaceId: workspace.id,
                createdAt: { gte: since24Hours }
            }
        });

        const repliedLeads = await prisma.redditOpportunity.count({
            where: {
                workspaceId: workspace.id,
                status: 'DONE'
            }
        });

        return NextResponse.json({
            opportunities,
            stats: {
                newLeads24h: newLeads,
                totalReplied: repliedLeads,
                estimatedClicks: repliedLeads * 14 // Mock metric: avg 14 clicks per engaged thread
            }
        });

    } catch (error: any) {
        console.error('[Reddit API] Failed to fetch opportunities:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// Update the status of an opportunity (e.g. marking as DONE or IGNORED)
export async function PATCH(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);
        const { id, status } = await request.json();

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
        }

        const updated = await prisma.redditOpportunity.update({
            where: {
                id: id,
                workspaceId: workspace.id // Ensure user owns this record
            },
            data: {
                status: status
            }
        });

        return NextResponse.json({ success: true, opportunity: updated });

    } catch (error: any) {
        console.error('[Reddit API] Failed to update opportunity:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
