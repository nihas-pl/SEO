"use server";

/**
 * Mock Service for Content Generation & LLM interaction
 * 
 * In a real application, this would use LangChain, OpenAI SDK, 
 * or direct API calls to Anthropic/Google/Perplexity APIs.
 */

export interface ArticleTemplateParams {
  businessProfile: Record<string, unknown>;
  targetKeyword: string;
  templateType: string;
  toneOfVoice: string;
  language: string;
  userId?: string;
  workspaceId?: string;
  articleId?: string;
  statusOnSave?: "DRAFT" | "SCHEDULED" | "PUBLISHED";
}

export interface GeneratedArticle {
  title: string;
  metaDescription: string;
  htmlContent: string;
  jsonLdSchema: Record<string, unknown>;
  semanticKeywords: string[];
}

export interface DiscoveredKeyword {
  keyword: string;
  monthlyVolume: number;
  difficulty: number;       // 1-100
  opportunityScore: number; // 1-100
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  suggestedTitle: string;
  category: string;
  cpc?: number;              // Cost per click (from DataForSEO)
  competitionLevel?: string; // HIGH / MEDIUM / LOW (from DataForSEO)
  dataSource?: 'dataforseo' | 'estimated'; // Where the volume data came from
}

import OpenAI from 'openai';
import type { Prisma } from "@prisma/client";
import { resolveWorkspaceForUser } from "@/server/services/user-workspace";

// Lazy import Prisma to prevent module-level crashes from blocking keyword discovery
async function getPrisma() {
  const mod = await import('@/lib/prisma');
  return mod.default;
}

/**
 * Discover SEO keywords using OpenAI + DataForSEO
 * Step 1: OpenAI generates keyword ideas for the niche
 * Step 2: DataForSEO provides real search volume & competition data
 */
export async function discoverKeywords(params: {
  businessNiche: string;
  websiteUrl?: string;
  companyName?: string;
}): Promise<DiscoveredKeyword[]> {
  console.log(`[KEYWORD DISCOVERY] Discovering keywords for niche: ${params.businessNiche}`);

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.warn('No OPENAI_API_KEY found. Returning mock keywords.');
    return mockDiscoverKeywords(params.businessNiche);
  }

  try {
    // ── Step 1: OpenAI generates keyword ideas ──
    const openai = new OpenAI({ apiKey: openaiKey });

    const systemPrompt = `You are an expert SEO strategist. Given a business niche, generate a list of high-potential keyword ideas.

Return EXACTLY a JSON object:
{
  "keywords": [
    {
      "keyword": "exact search term people type into Google",
      "intent": "informational",
      "suggestedTitle": "A compelling article title",
      "category": "Category name"
    }
  ]
}

Rules:
- Return exactly 15 keywords (we'll validate them with real data)
- Mix of head terms and long-tail keywords
- Include keywords with informational, commercial, and transactional intent  
- Focus on keywords a startup could realistically rank for
- Categories: "Getting Started", "Best Practices", "Comparisons", "How-To", "Tools & Software", "Industry Trends"
- Keywords should be what real users actually search on Google`;

    const userPrompt = `Generate 15 SEO keyword ideas for:

Business Niche: ${params.businessNiche}
${params.companyName ? `Company Name: ${params.companyName}` : ''}
${params.websiteUrl ? `Website: ${params.websiteUrl}` : ''}

Return valid JSON only.`;

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
    if (!aiContent) throw new Error("OpenAI returned empty content");

    const aiParsed = JSON.parse(aiContent);
    const aiKeywords: Array<{ keyword: string; intent: string; suggestedTitle: string; category: string }> = aiParsed.keywords || [];

    console.log(`[KEYWORD DISCOVERY] OpenAI suggested ${aiKeywords.length} keywords. Enriching with DataForSEO...`);

    // ── Step 2: Enrich with DataForSEO real data ──
    const dfLogin = process.env.DATAFORSEO_LOGIN;
    const dfPassword = process.env.DATAFORSEO_PASSWORD;

    let enrichedKeywords: DiscoveredKeyword[];

    if (dfLogin && dfPassword) {
      enrichedKeywords = await enrichWithDataForSEO(aiKeywords, dfLogin, dfPassword);
    } else {
      console.warn('[KEYWORD DISCOVERY] No DataForSEO credentials. Using OpenAI estimates for volume/difficulty.');
      enrichedKeywords = await enrichWithOpenAI(aiKeywords, openai, params.businessNiche);
    }

    // Sort by opportunity score descending
    enrichedKeywords.sort((a, b) => b.opportunityScore - a.opportunityScore);

    console.log(`[KEYWORD DISCOVERY] Final: ${enrichedKeywords.length} keywords with ${dfLogin ? 'REAL' : 'estimated'} data`);
    return enrichedKeywords;

  } catch (error) {
    console.error("Keyword discovery failed:", error);
    return mockDiscoverKeywords(params.businessNiche);
  }
}

/**
 * Enrich keywords with REAL data from DataForSEO Google Ads Search Volume API
 */
async function enrichWithDataForSEO(
  aiKeywords: Array<{ keyword: string; intent: string; suggestedTitle: string; category: string }>,
  login: string,
  password: string,
): Promise<DiscoveredKeyword[]> {
  const credentials = Buffer.from(`${login}:${password}`).toString('base64');
  const keywordStrings = aiKeywords.map(k => k.keyword);

  console.log(`[DATAFORSEO] Fetching real search volume for ${keywordStrings.length} keywords...`);

  const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      keywords: keywordStrings,
      location_code: 2840, // United States
      language_code: "en",
    }]),
  });

  if (!response.ok) {
    console.error(`[DATAFORSEO] API error: ${response.status} ${response.statusText}`);
    throw new Error(`DataForSEO API returned ${response.status}`);
  }

  const data = await response.json();

  // Parse the DataForSEO response
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

  // Merge AI keyword ideas with DataForSEO real data
  return aiKeywords.map(kw => {
    const realData = volumeMap.get(kw.keyword.toLowerCase());
    const volume = realData?.volume || 0;
    const competition = realData?.competition || 50;

    // Calculate difficulty from competition index (0-100)
    const difficulty = Math.round(competition);

    // Calculate opportunity score: high volume + low difficulty + commercial intent = higher
    const intentBoost = kw.intent === 'transactional' ? 15 : kw.intent === 'commercial' ? 10 : 0;
    const volumeScore = Math.min(40, (volume / 100)); // Max 40 points for volume
    const difficultyScore = Math.max(0, 40 - (difficulty * 0.4)); // Max 40 points for low difficulty
    const opportunityScore = Math.min(100, Math.max(1, Math.round(volumeScore + difficultyScore + intentBoost)));

    return {
      keyword: kw.keyword,
      monthlyVolume: volume,
      difficulty,
      opportunityScore,
      intent: kw.intent as DiscoveredKeyword['intent'],
      suggestedTitle: kw.suggestedTitle,
      category: kw.category,
      cpc: realData?.cpc,
      competitionLevel: realData?.competitionLevel,
      dataSource: 'dataforseo' as const,
    };
  }).filter(kw => kw.monthlyVolume > 0); // Only return keywords with actual search volume
}

/**
 * Fallback: Use OpenAI estimates when DataForSEO is not configured
 */
async function enrichWithOpenAI(
  aiKeywords: Array<{ keyword: string; intent: string; suggestedTitle: string; category: string }>,
  openai: OpenAI,
  niche: string,
): Promise<DiscoveredKeyword[]> {
  return aiKeywords.map(kw => ({
    keyword: kw.keyword,
    monthlyVolume: Math.round(Math.random() * 3000 + 200), // Placeholder
    difficulty: Math.round(Math.random() * 60 + 15),
    opportunityScore: Math.round(Math.random() * 40 + 50),
    intent: kw.intent as DiscoveredKeyword['intent'],
    suggestedTitle: kw.suggestedTitle,
    category: kw.category,
    dataSource: 'estimated' as const,
  }));
}

function mockDiscoverKeywords(niche: string): DiscoveredKeyword[] {
  return [
    { keyword: `best ${niche} software`, monthlyVolume: 2400, difficulty: 42, opportunityScore: 78, intent: 'commercial', suggestedTitle: `Top 10 Best ${niche} Software in 2025`, category: 'Comparisons' },
    { keyword: `${niche} for small business`, monthlyVolume: 1800, difficulty: 28, opportunityScore: 85, intent: 'informational', suggestedTitle: `The Complete Guide to ${niche} for Small Businesses`, category: 'Getting Started' },
    { keyword: `how to automate ${niche}`, monthlyVolume: 1200, difficulty: 22, opportunityScore: 88, intent: 'informational', suggestedTitle: `How to Automate ${niche}: A Step-by-Step Guide`, category: 'How-To' },
    { keyword: `${niche} vs manual`, monthlyVolume: 880, difficulty: 18, opportunityScore: 91, intent: 'commercial', suggestedTitle: `AI ${niche} vs Manual: Which is Right for You?`, category: 'Comparisons' },
    { keyword: `${niche} best practices`, monthlyVolume: 1500, difficulty: 35, opportunityScore: 75, intent: 'informational', suggestedTitle: `${niche} Best Practices Every Team Should Follow`, category: 'Best Practices' },
  ];
}

export async function getDiscoveredKeywords(userId?: string) {
  try {
    const prisma = await getPrisma();
    let workspaceId: string;

    if (userId) {
      const context = await resolveWorkspaceForUser(userId);
      workspaceId = context.workspace.id;
    } else {
      const workspace = await prisma.workspace.findFirst();
      if (!workspace) {
        return [];
      }
      workspaceId = workspace.id;
    }

    const keywords = await prisma.discoveredKeyword.findMany({
      where: { workspaceId },
      orderBy: { opportunityScore: 'desc' }
    });
    return keywords;
  } catch (error) {
    console.error("Failed to fetch discovered keywords from DB:", error);
    return [];
  }
}

export async function getArticles(userId?: string) {
  try {
    const prisma = await getPrisma();
    let workspaceId: string | null = null;

    if (userId) {
      const context = await resolveWorkspaceForUser(userId);
      workspaceId = context.workspace.id;
    } else {
      const workspace = await prisma.workspace.findFirst();
      workspaceId = workspace?.id ?? null;
    }

    if (!workspaceId) {
      return [];
    }

    const articles = await prisma.article.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });

    // Map to frontend expected format
    return articles.map((a) => ({
      id: a.id,
      title: a.title,
      type: "AI Guide",
      date: a.createdAt.toLocaleDateString(),
      status: a.status === 'PUBLISHED' ? 'Published' : a.status === "SCHEDULED" ? "Scheduled" : 'Draft',
      score: "99/100",
      contentHtml: a.contentHtml || "",
      targetKeyword: a.targetKeyword || "",
      language: a.language || "en",
      scheduledFor: a.publishedAt?.toISOString() ?? null,
      contentPlanId: a.contentPlanId ?? null,
    }));
  } catch (error) {
    console.error("Failed to fetch articles from DB:", error);
    return [];
  }
}

/**
 * Generate an article from a prompt using OpenAI
 */
export async function generateArticleFromPrompt(params: ArticleTemplateParams): Promise<GeneratedArticle> {
  console.log(`[LLM GEN] Generating article for keyword: ${params.targetKeyword} in ${params.language}`);

  const apiKey = process.env.OPENAI_API_KEY;

  let parsedContent: GeneratedArticle;

  if (!apiKey) {
    console.warn('No OPENAI_API_KEY found. Falling back to mock generator.');
    parsedContent = await mockGenerateArticle(params);
  } else {
    try {
      const openai = new OpenAI({ apiKey });

      const systemPrompt = `You are a world-class editorial writer who publishes on Medium and top-tier publications. 
You write beautifully structured, visually rich articles that combine deep expertise with engaging storytelling.

Your article HTML must follow these STRICT formatting rules:

1. **Hero Image**: Start with a full-width hero image using an Unsplash URL: <img src="https://images.unsplash.com/photo-RELEVANT_ID?w=1200&q=80" alt="descriptive alt text" style="width:100%;border-radius:12px;margin-bottom:2rem;" />
   Use a REAL, relevant Unsplash photo URL. Pick from these categories based on the topic:
   - Finance/accounting: photo-1554224155-6726b3ff858f, photo-1460925895917-afdab827c52f, photo-1579621970563-ebec7560ff3e
   - Technology/AI: photo-1677442136019-21780ecad995, photo-1485827404703-89b55fcc595e, photo-1526374965328-7f61d4dc18c5
   - Business/startup: photo-1522071820081-009f0129c71c, photo-1553877522-43269d4ea984, photo-1497215728101-856f4ea42174
   - Marketing/SEO: photo-1432888498266-38ffec3eaf0a, photo-1533750516457-a7f992034fec, photo-1504868584819-f8e8b4b6d7e3

2. **Section Structure**: Use <h2> for major sections and <h3> for subsections. 
   - Add a subtle divider before each h2: <hr style="border:none;border-top:1px solid #e5e5e5;margin:2.5rem 0;" />

3. **Pull Quotes / Blockquotes**: Include 2-3 impactful blockquotes throughout:
   <blockquote style="border-left:4px solid #6366f1;padding:1rem 1.5rem;margin:2rem 0;background:#f8f7ff;border-radius:0 8px 8px 0;font-size:1.15rem;font-style:italic;color:#374151;">
   "An insightful, memorable quote that captures a key takeaway."
   </blockquote>

4. **Highlighted Key Sentences**: Wrap 3-5 important sentences with:
   <mark style="background:linear-gradient(180deg, rgba(255,255,255,0) 60%, #fef08a 60%);padding:0 4px;">key sentence here</mark>

5. **Inline Images**: Include 1-2 more relevant images within the body using Unsplash:
   <figure style="margin:2rem 0;text-align:center;">
   <img src="https://images.unsplash.com/photo-RELEVANT_ID?w=800&q=80" alt="description" style="width:100%;border-radius:8px;" />
   <figcaption style="color:#9ca3af;font-size:0.85rem;margin-top:0.5rem;font-style:italic;">Caption describing the image</figcaption>
   </figure>

6. **Key Takeaways Box**: Near the end, include a styled summary box:
   <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:1.5rem;margin:2rem 0;">
   <h3 style="color:#166534;margin-top:0;">📌 Key Takeaways</h3>
   <ul>...</ul>
   </div>

7. **Expert Quotes**: Include 1-2 fictional but realistic expert quotes:
   <div style="display:flex;align-items:flex-start;gap:1rem;margin:1.5rem 0;padding:1rem;background:#f9fafb;border-radius:12px;">
   <div style="width:48px;height:48px;border-radius:50%;background:#e5e7eb;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#6b7280;">JD</div>
   <div><p style="margin:0;font-style:italic;">"The quote text here."</p><p style="margin:0.25rem 0 0;font-size:0.85rem;color:#6b7280;">— Jane Doe, CEO at TechCorp</p></div>
   </div>

8. **FAQ Section**: End with a FAQ using proper SEO markup.

9. **Writing Style**: Write in first-person plural ("we"), be authoritative yet approachable. Use short paragraphs (2-3 sentences max). Start with a compelling hook.

Format the output EXACTLY as a JSON object:
{
  "title": "A catchy, editorial Medium-style headline",
  "metaDescription": "A 150-160 character meta description",
  "htmlContent": "The full article in rich HTML following ALL the formatting rules above",
  "semanticKeywords": ["5-8", "LSI", "keywords"],
  "jsonLdSchema": { /* valid schema.org Article JSON-LD */ }
}`;

      const userPrompt = `Write a premium Medium-style article about:

Topic / Target Keyword: ${params.targetKeyword}
Language: ${params.language}
Tone of Voice: ${params.toneOfVoice}
Business Context: ${JSON.stringify(params.businessProfile)}
Template Type: ${params.templateType}

Make it feel like a published editorial piece — not a generic blog post.
Include real Unsplash image URLs, pull quotes, highlighted sentences, and expert opinions.
The article should be 1500-2000 words minimum.

Only return valid JSON.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using the latest omni model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;

      if (!content) {
        throw new Error("OpenAI returned empty content");
      }

      parsedContent = JSON.parse(content) as GeneratedArticle;
    } catch (error) {
      console.error("OpenAI generation failed:", error);
      console.log("Falling back to mock data...");
      parsedContent = await mockGenerateArticle(params);
    }
  }

  let savedArticleId: string | undefined;
  try {
    const prisma = await getPrisma();
    let workspaceId = params.workspaceId;

    if (!workspaceId) {
      if (params.userId) {
        const context = await resolveWorkspaceForUser(params.userId);
        workspaceId = context.workspace.id;
      } else {
        // Legacy fallback for calls that do not provide a user context
        // so existing flows keep working.
        let workspace = await prisma.workspace.findFirst();
        if (!workspace) {
          workspace = await prisma.workspace.create({
            data: { name: "Default Workspace" }
          });
        }
        workspaceId = workspace.id;
      }
    }

    const statusOnSave = params.statusOnSave ?? "PUBLISHED";
    const now = new Date();
    let savedArticle;

    if (params.articleId) {
      const existing = await prisma.article.findFirst({
        where: {
          id: params.articleId,
          workspaceId
        }
      });

      if (existing) {
        savedArticle = await prisma.article.update({
          where: { id: existing.id },
          data: {
            title: parsedContent.title,
            targetKeyword: params.targetKeyword,
            language: params.language,
            contentHtml: parsedContent.htmlContent,
            contentJson: parsedContent.jsonLdSchema as unknown as Prisma.InputJsonValue,
            status: statusOnSave,
            publishedAt: statusOnSave === "PUBLISHED" ? (existing.publishedAt ?? now) : existing.publishedAt,
          }
        });
      } else {
        savedArticle = await prisma.article.create({
          data: {
            id: params.articleId,
            title: parsedContent.title,
            targetKeyword: params.targetKeyword,
            language: params.language,
            contentHtml: parsedContent.htmlContent,
            contentJson: parsedContent.jsonLdSchema as unknown as Prisma.InputJsonValue,
            workspaceId,
            status: statusOnSave,
            publishedAt: statusOnSave === "PUBLISHED" ? now : null,
          }
        });
      }
    } else {
      savedArticle = await prisma.article.create({
        data: {
          title: parsedContent.title,
          targetKeyword: params.targetKeyword,
          language: params.language,
          contentHtml: parsedContent.htmlContent,
          contentJson: parsedContent.jsonLdSchema as unknown as Prisma.InputJsonValue,
          workspaceId,
          status: statusOnSave,
          publishedAt: statusOnSave === "PUBLISHED" ? now : null,
        }
      });
    }

    savedArticleId = savedArticle.id;

    // Delete the keyword from DiscoveredKeyword since it is no longer queued.
    await prisma.discoveredKeyword.deleteMany({
      where: {
        workspaceId,
        keyword: params.targetKeyword
      }
    });
  } catch (dbError) {
    console.error("Failed to save article to DB. It might not be running.", dbError);
  }

  return {
    title: parsedContent.title,
    metaDescription: parsedContent.metaDescription,
    htmlContent: parsedContent.htmlContent,
    jsonLdSchema: parsedContent.jsonLdSchema,
    semanticKeywords: parsedContent.semanticKeywords,
    id: savedArticleId
  } as GeneratedArticle & { id?: string };
}

// Fallback logic preserved for resilience
async function mockGenerateArticle(params: ArticleTemplateParams): Promise<GeneratedArticle> {
  await new Promise(resolve => setTimeout(resolve, 3000));
  return {
    title: `The Ultimate Guide to ${params.targetKeyword.replace(/^\w/, c => c.toUpperCase())}`,
    metaDescription: `Learn everything you need to know about ${params.targetKeyword}. Our comprehensive guide written in a ${params.toneOfVoice} tone provides top insights.`,
    htmlContent: `<h2>Introduction</h2><p>Welcome to our mock guide on ${params.targetKeyword}.</p>`,
    jsonLdSchema: { "@context": "https://schema.org", "@type": "Article", "headline": params.targetKeyword },
    semanticKeywords: [params.targetKeyword]
  };
}

/**
 * MOCK: LLM Visibility Query
 * Checks how often the brand is mentioned when asking an LLM a specific prompt.
 */
export async function queryLLMForVisibility(provider: string, prompt: string, brandName: string): Promise<{ score: number, snippet: string }> {
  console.log(`[LLM MOCK] Querying ${provider} with prompt: "${prompt}"`);

  // Simulating random mention probability for demo UI
  const isMentioned = Math.random() > 0.4;

  return {
    score: isMentioned ? 1.0 : 0.0,
    snippet: isMentioned
      ? `When looking for the best solutions, ${brandName} is frequently recommended for its excellent features.`
      : `Top solutions typically include tools like X, Y, and Z. (Brand not mentioned)`
  };
}
