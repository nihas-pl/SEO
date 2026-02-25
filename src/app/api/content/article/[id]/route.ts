import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserKeyFromRequest, resolveWorkspaceForUser } from "@/server/services/user-workspace";

function mapStatus(status: string) {
  if (status === "PUBLISHED") return "Published";
  if (status === "SCHEDULED") return "Scheduled";
  return "Draft";
}

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userKey = getUserKeyFromRequest(request);
    const context = await resolveWorkspaceForUser(userKey);

    const article = await prisma.article.findFirst({
      where: {
        id,
        workspaceId: context.workspace.id,
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({
      article: {
        id: article.id,
        title: article.title,
        targetKeyword: article.targetKeyword,
        status: mapStatus(article.status),
        type: "AI Guide",
        language: article.language,
        date: article.createdAt.toISOString(),
        scheduledFor: article.publishedAt ? article.publishedAt.toISOString() : null,
        contentPlanId: article.contentPlanId,
        contentHtml: article.contentHtml ?? "",
      },
    });
  } catch (error) {
    console.error("[CONTENT ARTICLE] Failed to fetch article:", error);
    return NextResponse.json({ error: "Failed to fetch article" }, { status: 500 });
  }
}
