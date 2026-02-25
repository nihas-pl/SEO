import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/services/user-workspace';
import prisma from '@/lib/prisma';
import { fetchRedditThreads, analyzeRedditOpportunity } from '@/server/services/reddit';

export const maxDuration = 60; // Allow long running scans

export async function POST(request: Request) {
    try {
        const { workspace } = await getAuthenticatedUser(request);

        // 1. Get the user's intent or keywords to scan for.
        // For a true MVP, we can pull from their generic target audience or rely on a default.
        const query = workspace.industry;
        const brandName = workspace.name;

        if (!query) {
            return NextResponse.json({ message: "No industry defined in workspace. Please set 'Target Keyword/Industry' in onboarding." }, { status: 400 });
        }

        console.log(`[Reddit Scan API] Beginning scan for Workspace: ${brandName}, Query: ${query}`);

        // 2. Fetch recent raw threads from Reddit Search JSON
        const rawThreads = await fetchRedditThreads(query, 15);

        if (!rawThreads || rawThreads.length === 0) {
            return NextResponse.json({ message: "No recent threads found matching keywords on Reddit." });
        }

        // 3. Prevent evaluating duplicates (Check if URL exists in DB already)
        const existingUrls = await prisma.redditOpportunity.findMany({
            where: {
                workspaceId: workspace.id,
                threadUrl: {
                    in: rawThreads.map(t => t.url)
                }
            },
            select: { threadUrl: true }
        });
        const existingUrlSet = new Set(existingUrls.map(e => e.threadUrl));

        const freshThreads = rawThreads.filter(t => !existingUrlSet.has(t.url));

        if (freshThreads.length === 0) {
            return NextResponse.json({ message: "No NEW threads found. All recent threads have already been scanned." });
        }

        console.log(`[Reddit Scan API] Found ${freshThreads.length} new threads. Sending to OpenAI for relevance scoring...`);

        // 4. Send fresh threads through OpenAI to curate and generate reply strategies
        // We run these concurrently.
        const evaluations = await Promise.all(
            freshThreads.map(thread => analyzeRedditOpportunity(thread, brandName))
        );

        // 5. Filter for only high-intent / relevant opportunities (Score > 60)
        const goodLeads = evaluations.filter(evalResult => evalResult.isHighIntent || evalResult.relevanceScore > 60);

        if (goodLeads.length === 0) {
            console.log(`[Reddit Scan API] AI rejected all ${freshThreads.length} threads as irrelevant.`);
            return NextResponse.json({ message: "Scan complete. No highly relevant opportunities found this round." });
        }

        // 6. Bulk insert the good leads into the database
        await prisma.redditOpportunity.createMany({
            data: goodLeads.map(lead => ({
                workspaceId: workspace.id,
                subreddit: lead.thread.subreddit,
                threadUrl: lead.thread.url,
                title: lead.thread.title,
                snippet: lead.suggestedReply, // We hijack snippet to store the AI strategy
                relevanceScore: lead.relevanceScore,
                status: 'NEW'
            }))
        });

        return NextResponse.json({
            success: true,
            message: `Scan complete! Discovered ${goodLeads.length} new high-intent Reddit opportunities.`,
            newLeads: goodLeads.length
        });

    } catch (error: any) {
        console.error('[Reddit API] Scan failed:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
