"use server";

import { getAuthenticatedUser } from "@/server/services/user-workspace";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

/**
 * Technical SEO Audit Service
 * Uses Google PageSpeed Insights API (Lighthouse) to scan pages
 * and extract real performance/SEO/best-practices issues.
 */

export async function getAuditTargetUrl(): Promise<string | null> {
    try {
        // Since this is a server action, we can use the headers to authenticate
        const headerList = await headers();
        // create a mock request to pass to getAuthenticatedUser
        const request = new Request("http://localhost", { headers: headerList });
        const context = await getAuthenticatedUser(request);
        return context.workspace.domain || null;
    } catch {
        return null;
    }
}

export async function saveAuditResults(score: number, issues: any[]) {
    try {
        const headerList = await headers();
        const request = new Request("http://localhost", { headers: headerList });
        const context = await getAuthenticatedUser(request);

        const newAudit = await prisma.audit.create({
            data: {
                workspaceId: context.workspace.id,
                type: "Technical",
                status: "COMPLETED",
                summaryScore: score,
                issues: {
                    create: issues.map(issue => ({
                        url: issue.url.substring(0, 500), // Safety truncation
                        type: issue.type.substring(0, 100),
                        severity: issue.severity,
                        description: issue.description?.substring(0, 1000)
                    }))
                }
            }
        });
        return { success: true, auditId: newAudit.id };
    } catch (e) {
        console.error("[AUDIT] Failed to save audit to DB", e);
        return { success: false };
    }
}

export async function getLatestAudit() {
    try {
        const headerList = await headers();
        const request = new Request("http://localhost", { headers: headerList });
        const context = await getAuthenticatedUser(request);

        const audit = await prisma.audit.findFirst({
            where: {
                workspaceId: context.workspace.id,
                status: "COMPLETED"
            },
            orderBy: { createdAt: 'desc' },
            include: { issues: true }
        });

        if (!audit) return null;

        return {
            ...audit,
            createdAt: audit.createdAt.toISOString(),
            updatedAt: audit.updatedAt.toISOString(),
            issues: audit.issues.map(i => ({
                ...i,
                createdAt: i.createdAt.toISOString()
            }))
        };
    } catch (e) {
        console.error("[AUDIT] Failed to load latest audit", e);
        return null;
    }
}

/**
 * Discover real URLs from a website by:
 * 1. Trying to fetch and parse sitemap.xml
 * 2. Falling back to crawling the homepage for internal links
 */
export async function discoverUrls(baseUrl: string): Promise<string[]> {
    const base = baseUrl.replace(/\/$/, '');
    const origin = new URL(base).origin;
    const discoveredUrls = new Set<string>();
    discoveredUrls.add(base); // Always include the homepage

    // ── Step 1: Try sitemap.xml ──
    try {
        console.log(`[AUDIT] Trying sitemap: ${origin}/sitemap.xml`);
        const sitemapRes = await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(5000) });
        if (sitemapRes.ok) {
            const sitemapText = await sitemapRes.text();
            // Extract <loc> tags from sitemap XML
            const locMatches = sitemapText.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
            for (const match of locMatches) {
                const url = match[1].trim();
                if (url.startsWith(origin)) {
                    discoveredUrls.add(url);
                }
            }
            if (discoveredUrls.size > 1) {
                console.log(`[AUDIT] Found ${discoveredUrls.size} URLs from sitemap.xml`);
                // Cap at 10 pages to avoid API quota issues
                return Array.from(discoveredUrls).slice(0, 10);
            }
        }
    } catch (e) {
        console.log(`[AUDIT] No sitemap.xml found, falling back to homepage crawl`);
    }

    // ── Step 2: Crawl homepage HTML for internal links ──
    try {
        console.log(`[AUDIT] Crawling homepage: ${base}`);
        const pageRes = await fetch(base, { signal: AbortSignal.timeout(8000) });
        if (pageRes.ok) {
            const html = await pageRes.text();
            // Only extract href values from <a> tags (not <link>, <script>, etc.)
            const anchorMatches = html.matchAll(/<a\s[^>]*href=["'](.*?)["'][^>]*>/gi);
            for (const match of anchorMatches) {
                let href = match[1].trim();

                // Skip anchors, mailto, tel, javascript
                if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;

                // Convert relative URLs to absolute
                if (href.startsWith('/')) {
                    href = origin + href;
                }

                // Only include same-origin URLs
                if (href.startsWith(origin)) {
                    // Clean up trailing slashes and fragments
                    const cleanUrl = href.split('#')[0].split('?')[0].replace(/\/$/, '') || origin;

                    // Skip static asset files
                    const assetExtensions = /\.(js|css|ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|map|json|xml|txt|pdf|zip)$/i;
                    if (assetExtensions.test(cleanUrl)) continue;

                    discoveredUrls.add(cleanUrl);
                }
            }
        }
    } catch (e) {
        console.error(`[AUDIT] Failed to crawl homepage:`, e);
    }

    console.log(`[AUDIT] Discovered ${discoveredUrls.size} unique page URLs:`, Array.from(discoveredUrls));
    // Cap at 10 pages
    return Array.from(discoveredUrls).slice(0, 10);
}


// Audit IDs we want to skip (informational, not actionable)
const SKIP_AUDIT_IDS = new Set([
    'final-screenshot', 'screenshot-thumbnails', 'full-page-screenshot',
    'script-treemap-data', 'main-thread-tasks', 'diagnostics', 'network-requests',
    'network-rtt', 'network-server-latency', 'resource-summary', 'third-party-summary',
    'largest-contentful-paint-element', 'lcp-lazy-loaded', 'layout-shift-elements',
    'long-tasks', 'non-composited-animations', 'unsized-images', 'preload-fonts',
    'valid-source-maps', 'prioritize-lcp-image', 'csp-xss',
    'metrics', 'performance-budget', 'timing-budget',
    'mainthread-work-breakdown', 'bootup-time', 'uses-rel-preload',
    'font-display', 'third-party-facades',
]);

export async function scanSingleUrl(url: string): Promise<{ score: number, issues: any[] }> {
    console.log(`[AUDIT] Scanning page: ${url}`);

    const issues: any[] = [];
    let pageScore = 0;

    const googleApiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

    if (googleApiKey) {
        try {
            console.log(`[AUDIT] Fetching REAL PageSpeed Insights for: ${url}`);
            const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=seo&category=performance&category=best-practices&category=accessibility&key=${googleApiKey}`;
            const res = await fetch(apiUrl);
            const data = await res.json();

            // Check for API errors
            if (data.error) {
                console.error(`[AUDIT] API Error for ${url}:`, data.error.message);
                return {
                    score: 0,
                    issues: [{ url, type: "ApiError", severity: "HIGH", description: `Google API Error: ${data.error.message}` }]
                };
            }

            const categories = data.lighthouseResult?.categories || {};
            const seoScore = (categories.seo?.score ?? 0) * 100;
            const perfScore = (categories.performance?.score ?? 0) * 100;
            const a11yScore = (categories.accessibility?.score ?? 0) * 100;
            const bpScore = (categories['best-practices']?.score ?? 0) * 100;

            // Weighted combined score
            pageScore = Math.round((seoScore * 0.4) + (perfScore * 0.3) + (bpScore * 0.15) + (a11yScore * 0.15));

            console.log(`[AUDIT] Real scores for ${url} → SEO: ${seoScore}, Perf: ${perfScore}, A11y: ${a11yScore}, BP: ${bpScore}, Combined: ${pageScore}`);

            // ── Extract ALL failing/warning audits from Lighthouse ──
            const audits = data.lighthouseResult?.audits || {};
            const addedIds = new Set<string>();

            for (const [auditId, auditRaw] of Object.entries(audits)) {
                const audit = auditRaw as any;

                // Skip informational audits that aren't actionable
                if (SKIP_AUDIT_IDS.has(auditId)) continue;

                // Skip audits that passed (score >= 0.9) or are not applicable (score === null)
                if (audit.score === null || audit.score === undefined || audit.score >= 0.9) continue;

                // Already added
                if (addedIds.has(auditId)) continue;
                addedIds.add(auditId);

                // Determine severity based on score
                let severity = "LOW";
                if (audit.score === 0) severity = "HIGH";
                else if (audit.score < 0.5) severity = "HIGH";
                else if (audit.score < 0.9) severity = "MEDIUM";

                // Build a clean description
                let description = audit.title || auditId;
                if (audit.displayValue) {
                    description += ` — ${audit.displayValue}`;
                }

                issues.push({
                    url,
                    type: auditId,
                    severity,
                    description,
                });
            }

            // ── Also extract category-level audit refs that failed ──
            for (const cat of Object.values(categories) as any[]) {
                for (const auditRef of (cat.auditRefs || [])) {
                    const audit = audits[auditRef.id] as any;
                    if (!audit) continue;
                    if (audit.score === null || audit.score >= 0.9) continue;
                    if (addedIds.has(auditRef.id)) continue;
                    addedIds.add(auditRef.id);

                    let severity = "LOW";
                    if (audit.score === 0) severity = "HIGH";
                    else if (audit.score < 0.5) severity = "HIGH";
                    else if (audit.score < 0.9) severity = "MEDIUM";

                    let description = audit.title || auditRef.id;
                    if (audit.displayValue) {
                        description += ` — ${audit.displayValue}`;
                    }

                    issues.push({
                        url,
                        type: auditRef.id,
                        severity,
                        description,
                    });
                }
            }

            console.log(`[AUDIT] Found ${issues.length} issues for ${url}`);

        } catch (error) {
            console.error(`[AUDIT] Failed to fetch PageSpeed data for ${url}:`, error);
            pageScore = 0;
            issues.push({ url, type: "ApiError", severity: "HIGH", description: "Could not complete scan for this URL. Check network connectivity." });
        }
    } else {
        // MOCK BEHAVIOR: Runs if no API key is set
        console.warn("[AUDIT] No GOOGLE_PAGESPEED_API_KEY found. Using mock data.");
        await new Promise(resolve => setTimeout(resolve, 1500));

        const isProblematic = Math.random() > 0.8;
        if (isProblematic) {
            pageScore = 50;
            issues.push({
                url,
                type: "MissingMetaDescription",
                severity: "HIGH",
                description: "Core on-page element is missing, making LLM parsing difficult."
            });
        } else {
            pageScore = 100;
        }
    }

    return { score: pageScore, issues };
}
