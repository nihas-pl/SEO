/**
 * Mock Service for Backlink Exchange Matching
 * 
 * Algorithm to match relevant backlinks among partner nodes.
 */

export interface BacklinkNode {
    articleId: string;
    url: string;
    topicKeywords: string[];
    domainRating: number;
}

export function findBacklinkOpportunities(
    newArticle: BacklinkNode,
    networkArticles: BacklinkNode[]
) {
    console.log(`[BACKLINK MOCK] Scanning network for opportunities for article: ${newArticle.url}`);

    const opportunities = [];

    for (const candidate of networkArticles) {
        // Basic mock relevance matching: Check if there's any keyword overlap
        const intersection = candidate.topicKeywords.filter(kw =>
            newArticle.topicKeywords.includes(kw)
        );

        if (intersection.length > 0) {
            // Create a bidirectional or unidirectional opportunity
            const score = (intersection.length / Math.max(newArticle.topicKeywords.length, 1)) * 100;

            opportunities.push({
                sourceArticleId: candidate.articleId,
                targetArticleId: newArticle.articleId,
                proposedAnchor: intersection[0],
                relevanceScore: Math.min(score, 100),
                status: "PENDING"
            });
        }
    }

    return opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
