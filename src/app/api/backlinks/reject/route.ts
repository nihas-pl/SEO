import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/services/user-workspace';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);
        const { opportunityId } = await request.json();

        if (!opportunityId) {
            return NextResponse.json({ error: 'Missing opportunityId' }, { status: 400 });
        }

        // 1. Find the opportunity and secure it belongs to this workspace's articles
        const opportunity = await prisma.backlinkOpportunity.findUnique({
            where: { id: opportunityId },
            include: { targetArticle: true, sourceArticle: true }
        });

        if (!opportunity) {
            return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
        }

        // 2. Ensure only the HOST of the backlink (Source Article owner) can reject it
        if (opportunity.sourceArticle.workspaceId !== workspace.id) {
            return NextResponse.json({ error: 'Unauthorized. Only the hosting partner can reject this link.' }, { status: 403 });
        }

        // 2. Mark as REJECTED
        await prisma.backlinkOpportunity.update({
            where: { id: opportunityId },
            data: { status: 'REJECTED' }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Backlink Reject API] Failed:', error);
        return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
    }
}
