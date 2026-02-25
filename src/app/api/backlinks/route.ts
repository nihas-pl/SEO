import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/services/user-workspace';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);

        // Inbound: Other workspaces want a link ON your articles. YOU must approve these.
        const inboundOpportunities = await prisma.backlinkOpportunity.findMany({
            where: {
                sourceArticle: { workspaceId: workspace.id },
                status: 'PENDING'
            },
            include: {
                targetArticle: { include: { workspace: true } },
                sourceArticle: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Outbound: You requested a link on OTHER workspaces' articles. THEY must approve.
        const outboundOpportunities = await prisma.backlinkOpportunity.findMany({
            where: {
                targetArticle: { workspaceId: workspace.id },
                status: 'PENDING'
            },
            include: {
                targetArticle: true,
                sourceArticle: { include: { workspace: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Fetch active built links (links pointing TO your workspace)
        const activeLinks = await prisma.backlink.findMany({
            where: {
                targetArticle: { workspaceId: workspace.id },
                status: 'ACTIVE'
            },
            include: {
                targetArticle: true,
                sourceArticle: { include: { workspace: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            inboundOpportunities,
            outboundOpportunities,
            activeLinks,
            stats: {
                linksEarned: activeLinks.length,
                pendingApprovals: inboundOpportunities.length, // Actions you need to take
                outboundRequests: outboundOpportunities.length // Waiting on others
            }
        });

    } catch (error: any) {
        console.error('[Backlinks API] Failed to fetch:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);

        // 1. Get the user's published articles that need backlinks
        const myArticles = await prisma.article.findMany({
            where: { workspaceId: workspace.id, status: 'PUBLISHED' }
        });

        if (myArticles.length === 0) {
            return NextResponse.json({ message: "You have no published articles yet to build links to." });
        }

        console.log(`[Backlink Scanner] Scanning network for ${workspace.name}'s ${myArticles.length} published articles.`);

        // 2. Find published articles in OTHER workspaces
        const networkArticles = await prisma.article.findMany({
            where: {
                workspaceId: { not: workspace.id },
                status: 'PUBLISHED'
            },
            include: { workspace: true }
        });

        if (networkArticles.length === 0) {
            return NextResponse.json({ message: "No active partner articles found in the entire network." });
        }

        // 3. For MVP, we'll try to match the first user article with all network articles using OpenAI
        const targetArticle = myArticles[0];
        let newOpportunitiesCount = 0;

        for (const sourceArticle of networkArticles) {
            // Prevent proposing links if one already exists or is pending/rejected
            const existingOpp = await prisma.backlinkOpportunity.findFirst({
                where: {
                    sourceArticleId: sourceArticle.id,
                    targetArticleId: targetArticle.id,
                }
            });

            if (existingOpp) continue; // Already scanned this pair

            // 4. Use OpenAI to determine if it's a good contextual fit
            const prompt = `
You are an expert SEO looking for organic backlink opportunities.
Target Article (Needs a link): Title: "${targetArticle.title}" Keyword: "${targetArticle.targetKeyword}"
Source Article (Will host the link): Title: "${sourceArticle.title}" Keyword: "${sourceArticle.targetKeyword}"

Does the Source Article's theme naturally support linking to the Target Article? 
Return JSON with:
- "relevanceScore": Number 0-100
- "proposedAnchor": String, up to 5 words that exist naturally in the context of the Source Article that could link to the Target.
`;

            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" },
                    temperature: 0.2,
                });

                const rawJson = completion.choices[0]?.message?.content || "{}";
                const parsed = JSON.parse(rawJson);

                if (parsed.relevanceScore > 70 && parsed.proposedAnchor) {
                    await prisma.backlinkOpportunity.create({
                        data: {
                            sourceArticleId: sourceArticle.id,
                            targetArticleId: targetArticle.id,
                            proposedAnchor: parsed.proposedAnchor,
                            relevanceScore: parsed.relevanceScore,
                            status: 'PENDING'
                        }
                    });
                    newOpportunitiesCount++;
                }
            } catch (aiError) {
                console.error("[Backlink Scanner] OpenAI Error", aiError);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Scan complete! Found ${newOpportunitiesCount} new real backlink opportunities across the network.`
        });

    } catch (error: any) {
        console.error('[Backlink Scanner] Failed:', error);
        return NextResponse.json({ error: 'Failed to scan the network' }, { status: 500 });
    }
}
