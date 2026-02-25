import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { generateArticleFromPrompt } from "@/server/services/content-engine";
import { getUserKeyFromRequest, resolveWorkspaceForUser } from "@/server/services/user-workspace";

function mapStatus(status: string) {
  if (status === "PUBLISHED") return "Published";
  if (status === "SCHEDULED") return "Scheduled";
  return "Draft";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const articleId = typeof body.articleId === "string" ? body.articleId : "";

    if (!articleId) {
      return NextResponse.json({ error: "articleId is required" }, { status: 400 });
    }

    const userKey = getUserKeyFromRequest(request);
    const context = await resolveWorkspaceForUser(userKey);

    const scheduledArticle = await prisma.article.findFirst({
      where: {
        id: articleId,
        workspaceId: context.workspace.id,
      },
    });

    if (!scheduledArticle) {
      return NextResponse.json({ error: "Article not found for this user" }, { status: 404 });
    }

    if (scheduledArticle.contentHtml) {
      return NextResponse.json({
        article: {
          id: scheduledArticle.id,
          title: scheduledArticle.title,
          targetKeyword: scheduledArticle.targetKeyword,
          status: mapStatus(scheduledArticle.status),
          language: scheduledArticle.language,
          date: scheduledArticle.createdAt.toISOString(),
          scheduledFor: scheduledArticle.publishedAt ? scheduledArticle.publishedAt.toISOString() : null,
          contentHtml: scheduledArticle.contentHtml,
        },
      });
    }

    // Reuse an already-generated article for this keyword if it exists in this workspace.
    const existingGeneratedArticle = await prisma.article.findFirst({
      where: {
        workspaceId: context.workspace.id,
        targetKeyword: scheduledArticle.targetKeyword,
        contentHtml: { not: null },
        id: { not: scheduledArticle.id },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existingGeneratedArticle?.contentHtml) {
      const existingJson =
        existingGeneratedArticle.contentJson === null
          ? Prisma.JsonNull
          : (existingGeneratedArticle.contentJson as Prisma.InputJsonValue);

      const reusedArticle = await prisma.article.update({
        where: { id: scheduledArticle.id },
        data: {
          title: existingGeneratedArticle.title ?? scheduledArticle.title,
          contentHtml: existingGeneratedArticle.contentHtml,
          contentJson: existingJson,
          status: "PUBLISHED",
          publishedAt: scheduledArticle.publishedAt ?? new Date(),
        },
      });

      return NextResponse.json({
        article: {
          id: reusedArticle.id,
          title: reusedArticle.title,
          targetKeyword: reusedArticle.targetKeyword,
          status: mapStatus(reusedArticle.status),
          language: reusedArticle.language,
          date: reusedArticle.createdAt.toISOString(),
          scheduledFor: reusedArticle.publishedAt ? reusedArticle.publishedAt.toISOString() : null,
          contentHtml: reusedArticle.contentHtml ?? "",
          reusedExisting: true,
        },
      });
    }

    await generateArticleFromPrompt({
      targetKeyword: scheduledArticle.targetKeyword,
      businessProfile: {
        companyName: "AutoRank",
        coreProduct: "SEO Content Automation",
      },
      templateType: "Comprehensive Guide",
      toneOfVoice: "Professional, clear, and practical",
      language: "English",
      userId: userKey,
      workspaceId: context.workspace.id,
      articleId: scheduledArticle.id,
      statusOnSave: "PUBLISHED",
    });

    const generatedArticle = await prisma.article.findFirst({
      where: {
        id: scheduledArticle.id,
        workspaceId: context.workspace.id,
      },
    });

    if (!generatedArticle) {
      return NextResponse.json({ error: "Article generation succeeded but record was not found." }, { status: 500 });
    }

    return NextResponse.json({
      article: {
        id: generatedArticle.id,
        title: generatedArticle.title,
        targetKeyword: generatedArticle.targetKeyword,
        status: mapStatus(generatedArticle.status),
        language: generatedArticle.language,
        date: generatedArticle.createdAt.toISOString(),
        scheduledFor: generatedArticle.publishedAt ? generatedArticle.publishedAt.toISOString() : null,
        contentHtml: generatedArticle.contentHtml ?? "",
      },
    });
  } catch (error) {
    console.error("[CONTENT ARTICLE] Failed to generate article:", error);
    return NextResponse.json({ error: "Failed to generate article" }, { status: 500 });
  }
}
