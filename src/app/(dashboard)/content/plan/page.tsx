"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Globe,
  RefreshCw,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";

type DashboardView = "keywords" | "calendar" | "articles" | "detail";

type KeywordIntent = "informational" | "commercial" | "transactional" | "navigational";

type DiscoveredKeyword = {
  id: string;
  keyword: string;
  monthlyVolume: number;
  difficulty: number;
  opportunityScore: number;
  intent: KeywordIntent;
  suggestedTitle: string;
  category: string;
  cpc?: number | null;
  competitionLevel?: string | null;
  dataSource?: string | null;
};

type ArticleSummary = {
  id: string;
  title: string | null;
  targetKeyword: string;
  status: "Draft" | "Scheduled" | "Published";
  type: string;
  language: string;
  date: string;
  scheduledFor: string | null;
  contentPlanId: string | null;
};

type ArticleDetail = ArticleSummary & {
  contentHtml: string;
  reusedExisting?: boolean;
};

type ContentStateResponse = {
  user: {
    key: string;
    email: string;
    workspaceId: string;
  };
  keywords: DiscoveredKeyword[];
  articles: ArticleSummary[];
};

function normalizeUserKey(input: string) {
  const normalized = input.trim().toLowerCase();
  return normalized || "user1";
}

function isValidUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    // Must have a dot in hostname (e.g. example.com)
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

function formatVolume(volume: number) {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k`;
  }
  return String(volume);
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDisplayDate(input: string | null) {
  if (!input) return "-";
  const date = new Date(input);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStartDate = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(gridStartDate);
    date.setDate(gridStartDate.getDate() + index);
    return {
      date,
      inMonth: date.getMonth() === month,
    };
  });
}

function statusClass(status: ArticleSummary["status"]) {
  if (status === "Published") {
    return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  }
  if (status === "Scheduled") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }
  return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
}

export default function ContentPlanPage() {
  const [view, setView] = useState<DashboardView>("keywords");
  const [userKey, setUserKey] = useState("user1");
  const [userDraft, setUserDraft] = useState("user1");

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const [keywords, setKeywords] = useState<DiscoveredKeyword[]>([]);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<string[]>([]);

  const [startDate, setStartDate] = useState(dateInputValue(new Date()));

  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [openingArticleId, setOpeningArticleId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleDetail | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const requestHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-user-id": userKey,
    }),
    [userKey]
  );

  const loadState = useCallback(async () => {
    setIsLoadingState(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/content/state", {
        method: "GET",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to load content state");
      }

      const payload = (await response.json()) as ContentStateResponse & { user: { domain: string, industry: string } };

      // Auto-set website URL if it's missing from local state but present in workspace
      if (payload.user?.domain && !websiteUrl) {
        setWebsiteUrl(payload.user.domain);
      }

      setKeywords(payload.keywords || []);
      setArticles(payload.articles || []);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load content state");
    } finally {
      setIsLoadingState(false);
    }
  }, [websiteUrl]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const articlesByDate = useMemo(() => {
    const map = new Map<string, ArticleSummary[]>();

    for (const article of articles) {
      const sourceDate = article.scheduledFor ?? article.date;
      if (!sourceDate) continue;

      const parsedDate = new Date(sourceDate);
      if (Number.isNaN(parsedDate.getTime())) continue;
      if (parsedDate.getFullYear() !== currentYear) continue;

      const key = dateKey(parsedDate);
      const existing = map.get(key) ?? [];
      existing.push(article);
      map.set(key, existing);
    }

    for (const value of map.values()) {
      value.sort((a, b) => {
        const aValue = a.scheduledFor ?? a.date;
        const bValue = b.scheduledFor ?? b.date;
        return new Date(aValue).getTime() - new Date(bValue).getTime();
      });
    }

    return map;
  }, [articles, currentYear]);

  const sortedArticles = useMemo(() => {
    return [...articles].sort((a, b) => {
      const aDate = new Date(a.scheduledFor ?? a.date).getTime();
      const bDate = new Date(b.scheduledFor ?? b.date).getTime();
      return bDate - aDate;
    });
  }, [articles]);

  const toggleKeyword = (keywordId: string) => {
    setSelectedKeywordIds((previous) => {
      if (previous.includes(keywordId)) {
        return previous.filter((id) => id !== keywordId);
      }
      return [...previous, keywordId];
    });
  };

  const selectTopKeywords = () => {
    const topIds = keywords.slice(0, Math.min(8, keywords.length)).map((keyword) => keyword.id);
    setSelectedKeywordIds(topIds);
  };

  const handleDiscoverKeywords = async () => {
    const trimmedUrl = websiteUrl.trim();
    if (!trimmedUrl) {
      setUrlError("Please enter a website URL");
      return;
    }
    if (!isValidUrl(trimmedUrl)) {
      setUrlError("Please enter a valid URL (e.g. https://example.com)");
      return;
    }

    setUrlError(null);
    setIsDiscovering(true);
    setErrorMessage(null);

    const fullUrl = trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`;

    try {
      const response = await fetch("/api/keywords/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const payload = (await response.json()) as { keywords?: DiscoveredKeyword[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Keyword discovery failed");
      }

      setKeywords(payload.keywords ?? []);
      setSelectedKeywordIds([]);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Keyword discovery failed");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleCreatePlan = async () => {
    if (selectedKeywordIds.length === 0 || !startDate) return;

    setIsPlanning(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/content/plan", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          keywordIds: selectedKeywordIds,
          startDate,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create plan");
      }

      setSelectedKeywordIds([]);
      await loadState();
      setView("calendar");
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to create plan");
    } finally {
      setIsPlanning(false);
    }
  };

  const fetchArticleById = async (articleId: string) => {
    const response = await fetch(`/api/content/article/${articleId}`, {
      method: "GET",
      headers: {
        "x-user-id": userKey,
      },
    });

    const payload = (await response.json()) as { article?: ArticleDetail; error?: string };
    if (!response.ok || !payload.article) {
      throw new Error(payload.error || "Failed to load article");
    }

    return payload.article;
  };

  const handleOpenOrGenerateArticle = async (articleId: string) => {
    setOpeningArticleId(articleId);
    setErrorMessage(null);

    try {
      const existingArticle = await fetchArticleById(articleId);

      if (existingArticle.contentHtml) {
        setSelectedArticle(existingArticle);
        setView("detail");
        return;
      }

      const generateResponse = await fetch("/api/content/article/generate", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({ articleId }),
      });

      const generatedPayload = (await generateResponse.json()) as { article?: ArticleDetail; error?: string };
      if (!generateResponse.ok || !generatedPayload.article) {
        throw new Error(generatedPayload.error || "Failed to generate article");
      }

      setSelectedArticle(generatedPayload.article);
      setView("detail");
      await loadState();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to open article");
    } finally {
      setOpeningArticleId(null);
    }
  };

  const handleCopyHtml = async () => {
    if (!selectedArticle?.contentHtml) return;

    try {
      await navigator.clipboard.writeText(selectedArticle.contentHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("Failed to copy HTML", error);
    }
  };

  if (view === "detail" && selectedArticle) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedArticle(null);
            setView("calendar");
          }}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Calendar
        </Button>

        <div className="border-b pb-5">
          <h1 className="text-3xl font-bold tracking-tight">{selectedArticle.title || selectedArticle.targetKeyword}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-neutral-500">
            <Badge className={statusClass(selectedArticle.status)}>{selectedArticle.status}</Badge>
            <span>{toDisplayDate(selectedArticle.scheduledFor || selectedArticle.date)}</span>
            <span className="hidden sm:inline">|</span>
            <span className="font-medium">{selectedArticle.targetKeyword}</span>
            {selectedArticle.reusedExisting && (
              <Badge variant="outline" className="text-indigo-600 border-indigo-200">
                Reused Existing Draft
              </Badge>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleCopyHtml}>
            <Copy className="w-4 h-4" />
            {copied ? "Copied" : "Copy HTML"}
          </Button>
        </div>

        {selectedArticle.contentHtml ? (
          <article className="bg-white dark:bg-neutral-900 rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 sm:px-10 py-8">
              <div
                className="prose prose-neutral dark:prose-invert max-w-none
                  prose-headings:font-bold prose-p:leading-7
                  prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: selectedArticle.contentHtml }}
              />
            </div>
          </article>
        ) : (
          <Card>
            <CardContent className="p-10 text-center text-neutral-500">
              No article content is available for this item yet.
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">30-Day Content Planner</h1>
          <p className="text-neutral-500">
            Select keywords, choose a start date, and auto-build a calendar for {currentYear}.
          </p>
        </div>
      </div>

      {errorMessage && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <CardContent className="p-4 text-sm text-red-700 dark:text-red-300">{errorMessage}</CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit">
        <button
          onClick={() => setView("keywords")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === "keywords"
            ? "bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-neutral-100"
            : "text-neutral-500 hover:text-neutral-700"
            }`}
        >
          <Target className="w-4 h-4" />
          Keywords
        </button>
        <button
          onClick={() => setView("calendar")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === "calendar"
            ? "bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-neutral-100"
            : "text-neutral-500 hover:text-neutral-700"
            }`}
        >
          <CalendarDays className="w-4 h-4" />
          Calendar
        </button>
        <button
          onClick={() => setView("articles")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === "articles"
            ? "bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-neutral-100"
            : "text-neutral-500 hover:text-neutral-700"
            }`}
        >
          <FileText className="w-4 h-4" />
          Articles
        </button>
      </div>

      {view === "keywords" && (
        <div className="space-y-6">
          <Card className="border-dashed border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Keyword Suggestions</h2>
                  <p className="text-sm text-neutral-500">
                    Discover keyword suggestions based on your workspace's primary domain and industry.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={handleDiscoverKeywords} disabled={isDiscovering}>
                  {isDiscovering ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {isDiscovering ? "Running AI Analysis..." : "Rerank Keywords"}
                </Button>
                <Button variant="outline" onClick={selectTopKeywords} disabled={keywords.length === 0}>
                  Select Top 8
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Build 30-Day Plan</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <p className="text-sm text-neutral-500 mb-2">Selected keywords: {selectedKeywordIds.length}</p>
                <p className="text-xs text-neutral-400">Pick multiple keywords from the list below. Topics will be distributed across 30 days.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-500">Start Date</label>
                <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                <Button className="w-full" onClick={handleCreatePlan} disabled={isPlanning || selectedKeywordIds.length === 0 || !startDate}>
                  {isPlanning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CalendarDays className="w-4 h-4 mr-2" />}
                  {isPlanning ? "Creating Plan" : "Create 30-Day Calendar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b bg-neutral-50 dark:bg-neutral-900/50 text-xs uppercase tracking-wide text-neutral-500 font-semibold">
                <div className="col-span-1 text-center">Pick</div>
                <div className="col-span-4">Keyword</div>
                <div className="col-span-2 text-center">Volume</div>
                <div className="col-span-2 text-center">Difficulty</div>
                <div className="col-span-1 text-center">Score</div>
                <div className="col-span-2 text-center">Intent</div>
              </div>

              {isLoadingState ? (
                <div className="p-10 text-center text-neutral-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading keywords...
                </div>
              ) : keywords.length === 0 ? (
                <div className="p-10 text-center text-neutral-500">No keyword suggestions yet.</div>
              ) : (
                keywords.map((keyword) => {
                  const checked = selectedKeywordIds.includes(keyword.id);
                  return (
                    <div
                      key={keyword.id}
                      className="grid grid-cols-12 gap-4 px-5 py-4 border-b last:border-0 items-center hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40"
                    >
                      <div className="col-span-1 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleKeyword(keyword.id)}
                          className="h-4 w-4 accent-indigo-600"
                        />
                      </div>
                      <div className="col-span-4">
                        <p className="font-semibold text-sm">{keyword.keyword}</p>
                        <p className="text-xs text-neutral-500 truncate">{keyword.suggestedTitle}</p>
                      </div>
                      <div className="col-span-2 text-center text-sm font-medium">{formatVolume(keyword.monthlyVolume)}</div>
                      <div className="col-span-2 text-center">
                        <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800">{keyword.difficulty}</span>
                      </div>
                      <div className="col-span-1 text-center font-semibold">{keyword.opportunityScore}</div>
                      <div className="col-span-2 text-center">
                        <span className="text-[11px] px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          {keyword.intent}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {view === "calendar" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-600" />
                {currentYear} Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-500">
              Click any scheduled topic. If content already exists, it opens immediately. If not, the article is generated and then opened.
            </CardContent>
          </Card>

          <div className="space-y-6">
            {Array.from({ length: 12 }).map((_, monthIndex) => {
              const monthDate = new Date(currentYear, monthIndex, 1);
              const monthLabel = monthDate.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              });
              const cells = buildMonthGrid(currentYear, monthIndex);

              return (
                <Card key={monthLabel}>
                  <CardHeader>
                    <CardTitle className="text-lg">{monthLabel}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2 mb-2 text-xs uppercase tracking-wide text-neutral-500">
                      {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((day) => (
                        <div key={day} className="text-center font-semibold">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {cells.map((cell) => {
                        const key = dateKey(cell.date);
                        const dailyArticles = articlesByDate.get(key) ?? [];

                        return (
                          <div
                            key={key}
                            className={`min-h-[92px] border rounded-md p-2 text-xs ${cell.inMonth
                              ? "bg-white dark:bg-neutral-950"
                              : "bg-neutral-50 dark:bg-neutral-900/50 text-neutral-400"
                              } ${dailyArticles.length > 0 ? "border-indigo-200 dark:border-indigo-900" : ""}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold">{cell.date.getDate()}</span>
                              {dailyArticles.length > 0 && (
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400">{dailyArticles.length}</span>
                              )}
                            </div>

                            <div className="space-y-1">
                              {dailyArticles.slice(0, 2).map((article) => {
                                const isOpening = openingArticleId === article.id;
                                return (
                                  <button
                                    key={article.id}
                                    onClick={() => void handleOpenOrGenerateArticle(article.id)}
                                    className="w-full text-left px-1.5 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                                  >
                                    <div className="flex items-center gap-1">
                                      {article.status === "Published" ? (
                                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                                      ) : article.status === "Scheduled" ? (
                                        <Clock3 className="w-3 h-3 text-amber-600" />
                                      ) : (
                                        <FileText className="w-3 h-3 text-neutral-500" />
                                      )}
                                      <span className="truncate">{article.targetKeyword}</span>
                                      {isOpening && <RefreshCw className="w-3 h-3 animate-spin" />}
                                    </div>
                                  </button>
                                );
                              })}

                              {dailyArticles.length > 2 && (
                                <p className="text-[10px] text-neutral-500">+{dailyArticles.length - 2} more</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {view === "articles" && (
        <div className="space-y-4">
          {sortedArticles.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-neutral-500">No articles available for this user yet.</CardContent>
            </Card>
          ) : (
            sortedArticles.map((article) => {
              const isOpening = openingArticleId === article.id;
              return (
                <Card
                  key={article.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => void handleOpenOrGenerateArticle(article.id)}
                >
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{article.title || article.targetKeyword}</h3>
                      <p className="text-sm text-neutral-500">{article.targetKeyword}</p>
                      <p className="text-xs text-neutral-400">{toDisplayDate(article.scheduledFor || article.date)}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={statusClass(article.status)}>{article.status}</Badge>
                      {isOpening && <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
