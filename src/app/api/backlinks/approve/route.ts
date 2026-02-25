import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/services/user-workspace';
import prisma from '@/lib/prisma';
import { getPublisher } from '@/server/services/cms-publisher';

export async function POST(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);
        const { opportunityId } = await request.json();

        if (!opportunityId) {
            return NextResponse.json({ error: 'Missing opportunityId' }, { status: 400 });
        }

        // 1. Find the opportunity
        const opportunity = await prisma.backlinkOpportunity.findUnique({
            where: { id: opportunityId },
            include: { targetArticle: true, sourceArticle: true }
        });

        if (!opportunity) {
            return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
        }

        // 2. Ensure only the HOST of the backlink (Source Article owner) can approve it
        if (opportunity.sourceArticle.workspaceId !== workspace.id) {
            return NextResponse.json({ error: 'Unauthorized. Only the hosting partner can approve this link.' }, { status: 403 });
        }

        // 3. Mark as APPROVED
        await prisma.backlinkOpportunity.update({
            where: { id: opportunityId },
            data: { status: 'APPROVED' }
        });

        // 4. Create the actual ACTIVE backlink record
        const newBacklink = await prisma.backlink.create({
            data: {
                sourceArticleId: opportunity.sourceArticleId,
                targetArticleId: opportunity.targetArticleId,
                anchorText: opportunity.proposedAnchor,
                status: 'ACTIVE'
            }
        });

        // 5. Trigger programmatic CMS injection to physically insert HTML on the partner site
        try {
            // Note: In a fully live scenario we'd query CMSIntegration for this workspace
            // For now, call our publisher wrapper to demonstrate the technical side effect
            const publisher = getPublisher('wordpress');
            await publisher.updateArticle(opportunity.sourceArticle, { domain: 'mock-partner-site.com', url: 'https://mock-partner-site.com' });
        } catch (cmsError) {
            console.error('[CMS Injection Error]', cmsError);
            // We won't block the API response if CMS sync fails, we'd queue it for retry
        }

        return NextResponse.json({ success: true, backlink: newBacklink });

    } catch (error: any) {
        console.error('[Backlink Approve API] Failed:', error);
        return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
    }
}
