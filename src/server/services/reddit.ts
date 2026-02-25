import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface RedditThread {
    subreddit: string;
    url: string;
    title: string;
    snippet: string;
    createdAt: number;
}

export interface AnalyzedOpportunity {
    thread: RedditThread;
    relevanceScore: number;
    suggestedReply: string;
    isHighIntent: boolean;
}

/**
 * Searches Reddit for recent threads matching the query.
 */
export async function fetchRedditThreads(query: string, limit = 15): Promise<RedditThread[]> {
    console.log(`[REDDIT SCAN] Searching Reddit for: ${query}`);
    try {
        const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&t=week&limit=${limit}`;
        // Reddit requires a custom User-Agent to avoid immediate 429 rate limits
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'node:seo-writer:v1.0.0 (by /u/AutoRankApp)'
            }
        });

        if (!response.ok) {
            console.error(`[REDDIT SCAN] API Error: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        const threads: RedditThread[] = [];

        if (data && data.data && data.data.children) {
            for (const child of data.data.children) {
                const post = child.data;
                // Only consider text posts, ignore direct link shares or images
                if (post.selftext && post.selftext.length > 20) {
                    threads.push({
                        subreddit: post.subreddit_name_prefixed,
                        url: `https://www.reddit.com${post.permalink}`,
                        title: post.title,
                        snippet: post.selftext.substring(0, 300) + (post.selftext.length > 300 ? '...' : ''),
                        createdAt: post.created_utc * 1000,
                    });
                }
            }
        }
        return threads;
    } catch (error) {
        console.error("[REDDIT SCAN] Failed to fetch from Reddit:", error);
        return [];
    }
}

/**
 * Uses OpenAI to determine if the Reddit thread is a good fit for pitching the Target Brand.
 */
export async function analyzeRedditOpportunity(thread: RedditThread, targetBrand: string, productContext: string = ""): Promise<AnalyzedOpportunity> {
    try {
        const prompt = `
A user posted the following thread on Reddit in ${thread.subreddit}:
Title: "${thread.title}"
Body: "${thread.snippet}"

You are analyzing this post to see if it is a good opportunity to politely pitch the brand "${targetBrand}".
Context about the brand: ${productContext || 'It is a software/service tool.'}

Analyze the post and return a JSON object with EXACTLY these three keys:
- "relevanceScore": Number between 0 and 100. (100 = perfect match, asking for exactly what we do. 0 = completely irrelevant or hostile).
- "isHighIntent": Boolean (true if score > 70).
- "suggestedReply": A string. Write a short, helpful reply (max 3 sentences) that answers their question/pain point directly, and organically mentions ${targetBrand} as a solution. Do NOT sound like a spam bot.

JSON:
`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.4,
        });

        const rawJson = completion.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(rawJson);

        return {
            thread: thread,
            relevanceScore: parsed.relevanceScore || 0,
            isHighIntent: parsed.isHighIntent || false,
            suggestedReply: parsed.suggestedReply || "",
        };

    } catch (error) {
        console.error(`[REDDIT AI] Failed to analyze thread: ${thread.url}`, error);
        return { thread, relevanceScore: 0, isHighIntent: false, suggestedReply: "" };
    }
}
