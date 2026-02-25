import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, AuthError } from '@/server/services/user-workspace';

type KeywordIdea = {
    keyword: string;
    intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
    suggestedTitle: string;
    category: string;
};

function normalizeSeedTopic(input?: string): string {
    const raw = (input || '').trim().toLowerCase();
    if (!raw) return 'startup growth';

    return raw
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/[._/-]+/g, ' ')
        .trim();
}

function buildFallbackKeywordIdeas(seedInput?: string): KeywordIdea[] {
    const seed = normalizeSeedTopic(seedInput);
    const seeds = [
        `best ${seed} software`,
        `${seed} for small business`,
        `how to improve ${seed}`,
        `${seed} strategy`,
        `${seed} checklist`,
        `${seed} tools`,
        `${seed} examples`,
        `${seed} case study`,
        `${seed} vs manual`,
        `${seed} pricing guide`,
        `${seed} implementation`,
        `${seed} template`,
        `${seed} best practices`,
        `${seed} metrics`,
        `${seed} trends 2026`,
    ];

    const intents: KeywordIdea['intent'][] = [
        'commercial', 'informational', 'informational', 'commercial', 'informational',
        'commercial', 'informational', 'commercial', 'commercial', 'transactional',
        'transactional', 'informational', 'informational', 'informational', 'navigational'
    ];

    const categories = [
        'Comparisons', 'Getting Started', 'How-To', 'Best Practices', 'How-To',
        'Tools & Software', 'Industry Trends', 'Best Practices', 'Comparisons', 'Tools & Software',
        'How-To', 'Getting Started', 'Best Practices', 'Industry Trends', 'Industry Trends'
    ];

    return seeds.map((keyword, index) => ({
        keyword,
        intent: intents[index],
        suggestedTitle: `The Complete Guide to ${keyword.replace(/^\w/, char => char.toUpperCase())}`,
        category: categories[index],
    }));
}

export async function GET(request: Request) {
    try {
        const context = await getAuthenticatedUser(request);
        const keywords = await prisma.discoveredKeyword.findMany({
            where: {
                workspaceId: context.workspace.id,
            },
            orderBy: { opportunityScore: 'desc' }
        });

        return NextResponse.json({
            workspaceId: context.workspace.id,
            keywords
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[KEYWORD API] GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const context = await getAuthenticatedUser(request);
        const websiteUrl = context.workspace.domain;

        if (!websiteUrl) {
            return NextResponse.json({ error: 'Workspace domain is not configured.' }, { status: 400 });
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
        if (!openaiKey) {
            console.warn('[KEYWORD API] OPENAI_API_KEY missing; using heuristic fallback keyword suggestions.');
        }

        // Scrape the website content — this is required for keyword generation
        let scrapedContent = "";
        try {
            console.log(`[KEYWORD API] Fetching website content from: ${websiteUrl}`);
            const res = await fetch(websiteUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                signal: AbortSignal.timeout(12000)
            });

            if (res.ok) {
                const html = await res.text();
                const $ = cheerio.load(html);

                const title = $('title').text().trim();
                const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
                const metaKeywords = $('meta[name="keywords"]').attr('content')?.trim() || '';

                // Extract headings for better context
                const headings: string[] = [];
                $('h1, h2, h3').each((_, el) => {
                    const text = $(el).text().trim();
                    if (text) headings.push(text);
                });

                // Remove unnecessary elements
                $('script, style, noscript, nav, footer, header, svg, img, iframe').remove();

                // Extract clean body text
                const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

                const parts = [
                    `URL: ${websiteUrl}`,
                    `Title: ${title}`,
                    metaDescription ? `Meta Description: ${metaDescription}` : '',
                    metaKeywords ? `Meta Keywords: ${metaKeywords}` : '',
                    headings.length > 0 ? `Key Headings: ${headings.slice(0, 15).join(' | ')}` : '',
                    `\nBody Content: ${bodyText}`,
                ].filter(Boolean).join('\n');

                scrapedContent = parts.substring(0, 4000);
                console.log(`[KEYWORD API] Successfully scraped ${scrapedContent.length} characters from ${websiteUrl}`);
            } else {
                console.warn(`[KEYWORD API] Failed to fetch website. Status: ${res.status}`);
                return NextResponse.json({ error: `Could not fetch website (HTTP ${res.status}). Please check the URL.` }, { status: 400 });
            }
        } catch (err: any) {
            console.error(`[KEYWORD API] Website scraping failed for ${websiteUrl}:`, err.message);
            return NextResponse.json({ error: `Could not reach the website. Please check the URL and try again.` }, { status: 400 });
        }

        // Step 1: OpenAI suggests keyword ideas based on website content
        const systemPrompt = `You are an expert SEO strategist. Analyze the provided website content and generate highly relevant keyword ideas that the website should target to increase organic search traffic.

Return EXACTLY a JSON object:
{
  "keywords": [
    {
      "keyword": "exact search term people type into Google",
      "intent": "informational",
      "suggestedTitle": "A compelling article title for this keyword",
      "category": "Category name"
    }
  ]
}

Rules:
- Return exactly 15 keywords
- Analyze the website content deeply to understand what the business does, its products/services, target audience, and industry
- Generate keywords that are directly relevant to this specific business
- Mix of head terms and long-tail keywords
- Include keywords with informational, commercial, and transactional intent
- Focus on keywords the website could realistically rank for
- Categories: "Getting Started", "Best Practices", "Comparisons", "How-To", "Tools & Software", "Industry Trends"
- Keywords should be what real users actually search on Google
- Suggest article titles that would genuinely help the website's target audience`;

        const userPrompt = `Analyze the following website and generate 15 SEO keyword ideas based on its content, products, services, and target audience.

Website: ${websiteUrl}

${scrapedContent ? `Here is the extracted content from the website:\n\n"""\n${scrapedContent}\n"""` : 'Note: Website content could not be scraped. Generate keywords based on the URL and domain name.'}

Return valid JSON only.`;

        let aiKeywords: KeywordIdea[] = [];
        if (openai) {
            try {
                const aiResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.8,
                });

                const aiContent = aiResponse.choices[0].message.content;
                console.log(`[KEYWORD API] OpenAI raw response (first 500 chars):`, aiContent?.substring(0, 500));
                if (aiContent) {
                    const aiParsed = JSON.parse(aiContent);
                    const rawKeywords = Array.isArray(aiParsed?.keywords)
                        ? aiParsed.keywords
                        : Array.isArray(aiParsed?.keyword_ideas)
                            ? aiParsed.keyword_ideas
                            : [];

                    aiKeywords = rawKeywords
                        .filter((kw: any) => typeof kw?.keyword === 'string' && kw.keyword.trim())
                        .slice(0, 15)
                        .map((kw: any, index: number) => ({
                            keyword: kw.keyword.trim(),
                            intent: (kw.intent || 'informational') as KeywordIdea['intent'],
                            suggestedTitle: kw.suggestedTitle || `Guide to ${kw.keyword.trim()}`,
                            category: kw.category || ['Getting Started', 'Best Practices', 'Comparisons', 'How-To'][index % 4],
                        }));
                }
            } catch (err: any) {
                console.error('[KEYWORD API] OpenAI failed, switching to fallback ideas:', err?.message || err);
                console.error('[KEYWORD API] OpenAI error details:', JSON.stringify({ status: err?.status, code: err?.code, type: err?.type }, null, 2));
            }
        }

        if (aiKeywords.length === 0) {
            aiKeywords = buildFallbackKeywordIdeas(websiteUrl);
            console.log(`[KEYWORD API] Using fallback keyword ideas (${aiKeywords.length}).`);
        } else {
            console.log(`[KEYWORD API] OpenAI suggested ${aiKeywords.length} keywords; first keyword: ${JSON.stringify(aiKeywords[0])?.substring(0, 200)}`);
        }

        // Step 2: Enrich with DataForSEO or fallback to estimates
        const dfLogin = process.env.DATAFORSEO_LOGIN;
        const dfPassword = process.env.DATAFORSEO_PASSWORD;

        let keywords;

        const generateFallback = (aiKws: any[]) => aiKws.map((kw: any) => ({
            keyword: kw.keyword,
            monthlyVolume: Math.round(Math.random() * 3000 + 200),
            difficulty: Math.round(Math.random() * 60 + 15),
            opportunityScore: Math.round(Math.random() * 40 + 50),
            intent: kw.intent || 'informational',
            suggestedTitle: kw.suggestedTitle || `Guide to ${kw.keyword}`,
            category: kw.category || 'General',
            dataSource: 'estimated',
        }));

        if (dfLogin && dfPassword) {
            try {
                keywords = await enrichWithDataForSEO(aiKeywords, dfLogin, dfPassword);
                // Fallback to estimates if DataForSEO returned nothing (e.g. all 0 volume)
                if (!keywords || keywords.length === 0) {
                    console.log('[KEYWORD API] DataForSEO returned 0 keywords with volume, falling back to estimates');
                    keywords = generateFallback(aiKeywords);
                }
            } catch (err: any) {
                console.error('[KEYWORD API] DataForSEO error, falling back to estimates', err.message);
                keywords = generateFallback(aiKeywords);
            }
        } else {
            console.log('[KEYWORD API] No DataForSEO credentials — using AI estimates');
            keywords = generateFallback(aiKeywords);
        }

        // Sort by opportunity score descending
        keywords.sort((a: any, b: any) => b.opportunityScore - a.opportunityScore);

        // Step 3: Save keywords to DB
        try {
            // Delete previous keywords for this niche or website to keep DB clean
            const nicheLabel = websiteUrl;

            await prisma.discoveredKeyword.deleteMany({
                where: {
                    workspaceId: context.workspace.id,
                    niche: nicheLabel
                }
            });

            // Save new keywords
            const keywordsToSave = keywords.map((kw: any) => ({
                workspaceId: context.workspace.id,
                niche: nicheLabel,
                websiteUrl: websiteUrl || null,
                keyword: kw.keyword,
                monthlyVolume: kw.monthlyVolume,
                difficulty: kw.difficulty,
                opportunityScore: kw.opportunityScore,
                intent: kw.intent,
                suggestedTitle: kw.suggestedTitle,
                category: kw.category,
                cpc: kw.cpc || null,
                competitionLevel: kw.competitionLevel || null,
                dataSource: kw.dataSource
            }));

            await prisma.discoveredKeyword.createMany({
                data: keywordsToSave
            });

            // Re-fetch from DB so response includes the generated IDs
            const savedKeywords = await prisma.discoveredKeyword.findMany({
                where: { workspaceId: context.workspace.id, niche: nicheLabel },
                orderBy: { opportunityScore: 'desc' },
            });

            console.log(`[KEYWORD API] Saved ${savedKeywords.length} keywords to database for website: ${websiteUrl}`);

            return NextResponse.json({
                workspaceId: context.workspace.id,
                keywords: savedKeywords,
            });
        } catch (dbError) {
            console.error('[KEYWORD API] Failed to save keywords to DB:', dbError);
        }

        return NextResponse.json({
            workspaceId: context.workspace.id,
            keywords
        });

    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[KEYWORD API] Error:', error?.message || error);
        return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
    }
}

async function enrichWithDataForSEO(
    aiKeywords: Array<{ keyword: string; intent: string; suggestedTitle: string; category: string }>,
    login: string,
    password: string,
) {
    const credentials = Buffer.from(`${login}:${password}`).toString('base64');
    const keywordStrings = aiKeywords.map((k: any) => k.keyword);

    console.log(`[DATAFORSEO] Fetching real search volume for ${keywordStrings.length} keywords...`);

    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
            keywords: keywordStrings,
            location_code: 2840,
            language_code: "en",
        }]),
    });

    if (!response.ok) {
        console.error(`[DATAFORSEO] API error: ${response.status}`);
        throw new Error(`DataForSEO API returned ${response.status}`);
    }

    const data = await response.json();

    // DataForSEO specific errors (e.g., 40100 Unauthorized, despite HTTP 200)
    if (data.status_code && data.status_code !== 20000) {
        throw new Error(`DataForSEO Error ${data.status_code}: ${data.status_message}`);
    }

    const results: any[] = data?.tasks?.[0]?.result || [];
    const volumeMap = new Map<string, { volume: number; competition: number; cpc: number; competitionLevel: string }>();

    for (const result of results) {
        if (result?.keyword) {
            volumeMap.set(result.keyword.toLowerCase(), {
                volume: result.search_volume || 0,
                competition: result.competition_index != null ? result.competition_index : 50,
                cpc: result.cpc || 0,
                competitionLevel: result.competition || 'MEDIUM',
            });
        }
    }

    console.log(`[DATAFORSEO] Got real data for ${volumeMap.size} / ${keywordStrings.length} keywords`);

    return aiKeywords.map((kw: any) => {
        const realData = volumeMap.get(kw.keyword.toLowerCase());
        const volume = realData?.volume || 0;
        const competition = realData?.competition || 50;
        const difficulty = Math.round(competition);

        const intentBoost = kw.intent === 'transactional' ? 15 : kw.intent === 'commercial' ? 10 : 0;
        const volumeScore = Math.min(40, (volume / 100));
        const difficultyScore = Math.max(0, 40 - (difficulty * 0.4));
        const opportunityScore = Math.min(100, Math.max(1, Math.round(volumeScore + difficultyScore + intentBoost)));

        return {
            keyword: kw.keyword,
            monthlyVolume: volume,
            difficulty,
            opportunityScore,
            intent: kw.intent || 'informational',
            suggestedTitle: kw.suggestedTitle,
            category: kw.category,
            cpc: realData?.cpc,
            competitionLevel: realData?.competitionLevel,
            dataSource: 'dataforseo',
        };
    }).filter((kw: any) => kw.monthlyVolume > 0);
}
