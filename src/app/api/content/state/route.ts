import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, AuthError } from "@/server/services/user-workspace";

type ArticleStatusLabel = "Draft" | "Scheduled" | "Published";

function mapStatus(status: string): ArticleStatusLabel {
  if (status === "PUBLISHED") return "Published";
  if (status === "SCHEDULED") return "Scheduled";
  return "Draft";
}

export async function GET(request: Request) {
  try {
    const context = await getAuthenticatedUser(request);

    const [keywords, articles, contentPlans] = await Promise.all([
      prisma.discoveredKeyword.findMany({
        where: { workspaceId: context.workspace.id },
        orderBy: { opportunityScore: "desc" },
      }),
      prisma.article.findMany({
        where: { workspaceId: context.workspace.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contentPlan.findMany({
        where: { workspaceId: context.workspace.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      user: {
        id: context.user.id,
        email: context.user.email,
        workspaceId: context.workspace.id,
      },
      keywords,
      articles: articles.map((article) => ({
        id: article.id,
        title: article.title,
        targetKeyword: article.targetKeyword,
        status: mapStatus(article.status),
        type: "AI Guide",
        language: article.language,
        date: article.createdAt.toISOString(),
        scheduledFor: article.publishedAt ? article.publishedAt.toISOString() : null,
        contentPlanId: article.contentPlanId,
      })),
      contentPlans: contentPlans.map((plan) => ({
        id: plan.id,
        month: plan.month.toISOString(),
        status: plan.status,
        createdAt: plan.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[CONTENT STATE] Failed to load content state:", error);
    return NextResponse.json({ error: "Failed to load content state" }, { status: 500 });
  }
}
