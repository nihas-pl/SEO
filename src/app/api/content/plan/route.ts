import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, AuthError } from "@/server/services/user-workspace";

const TITLE_ANGLES = [
  "Complete Guide",
  "Step-by-Step Playbook",
  "Best Practices",
  "Common Mistakes to Avoid",
  "Tools and Templates",
  "Real-World Examples",
];

function addDays(baseDate: Date, days: number): Date {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function toTitleCase(keyword: string): string {
  return keyword.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildTopicTitle(baseTitle: string | null, keyword: string, index: number): string {
  if (index === 0 && baseTitle) {
    return baseTitle;
  }

  const angle = TITLE_ANGLES[index % TITLE_ANGLES.length];
  return `${angle}: ${toTitleCase(keyword)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const keywordIds = Array.isArray(body.keywordIds)
      ? body.keywordIds.filter((id: unknown): id is string => typeof id === "string")
      : [];
    const startDateRaw = typeof body.startDate === "string" ? body.startDate : "";
    const startDate = new Date(startDateRaw);

    if (keywordIds.length === 0) {
      return NextResponse.json({ error: "Select at least one keyword." }, { status: 400 });
    }

    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "A valid start date is required." }, { status: 400 });
    }

    const context = await getAuthenticatedUser(request);

    const selectedKeywords = await prisma.discoveredKeyword.findMany({
      where: {
        workspaceId: context.workspace.id,
        id: { in: keywordIds },
      },
      orderBy: { opportunityScore: "desc" },
    });

    if (selectedKeywords.length === 0) {
      return NextResponse.json({ error: "No matching keywords were found for this user." }, { status: 404 });
    }

    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const contentPlan = await prisma.contentPlan.create({
      data: {
        workspaceId: context.workspace.id,
        month: monthStart,
        status: "ACTIVE",
      },
    });

    const scheduledArticles = Array.from({ length: 30 }).map((_, dayIndex) => {
      const keyword = selectedKeywords[dayIndex % selectedKeywords.length];
      const scheduleDate = addDays(startDate, dayIndex);
      const title = buildTopicTitle(keyword.suggestedTitle, keyword.keyword, dayIndex);

      return {
        workspaceId: context.workspace.id,
        contentPlanId: contentPlan.id,
        title,
        targetKeyword: keyword.keyword,
        language: "en",
        status: "SCHEDULED",
        publishedAt: scheduleDate,
      };
    });

    await prisma.article.createMany({
      data: scheduledArticles,
    });

    const createdArticles = await prisma.article.findMany({
      where: {
        contentPlanId: contentPlan.id,
      },
      orderBy: { publishedAt: "asc" },
    });

    return NextResponse.json({
      message: "30-day content plan created.",
      contentPlan: {
        id: contentPlan.id,
        month: contentPlan.month.toISOString(),
        status: contentPlan.status,
      },
      articles: createdArticles.map((article) => ({
        id: article.id,
        title: article.title,
        targetKeyword: article.targetKeyword,
        status: article.status,
        scheduledFor: article.publishedAt ? article.publishedAt.toISOString() : null,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[CONTENT PLAN] Failed to create plan:", error);
    return NextResponse.json({ error: "Failed to create content plan." }, { status: 500 });
  }
}
