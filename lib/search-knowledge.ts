import "server-only";

import { prisma } from "@/lib/prisma";
import type { KnowledgeSearchInput } from "@/lib/validations/search";

export async function searchKnowledge(input: KnowledgeSearchInput) {
  const { q, status, urgency, skillId, page, limit } = input;
  const rawQuery = (q ?? "").trim();
  const searchTerms = rawQuery ? rawQuery.toLowerCase().split(/\s+/).filter(Boolean) : [];

  // Build Prisma `where` clause
  const where: Record<string, unknown> = {};

  if (status === "OPEN" || status === "RESOLVED") {
    where.status = status;
  } else {
    // Hide CLOSED moderation doubts from normal search results
    where.status = { in: ["OPEN", "RESOLVED"] };
  }

  if (urgency) {
    where.urgency = urgency;
  }

  if (skillId) {
    where.skills = {
      some: {
        skillId,
      },
    };
  }

  if (rawQuery) {
    where.OR = [
      { title: { contains: rawQuery } },
      { body: { contains: rawQuery } },
      {
        skills: {
          some: {
            skill: {
              OR: [
                { name: { contains: rawQuery } },
                { slug: { contains: rawQuery } },
              ],
            },
          },
        },
      },
      {
        answers: {
          some: {
            body: { contains: rawQuery },
          },
        },
      },
    ];
  }

  const rawDoubts = await prisma.doubt.findMany({
    where,
    include: {
      author: {
        include: {
          profile: true,
        },
      },
      skills: {
        include: {
          skill: true,
        },
      },
      answers: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Relevance Scoring Calculation
  // 1. Title/Skill exact or substring match
  // 2. Resolution bonus (status === RESOLVED and acceptedAnswer exists)
  // 3. Keyword presence in title / body / accepted answer
  // 4. Recency as tie-breaker
  const scored = rawDoubts.map((doubt) => {
    let score = 0;
    const titleLower = doubt.title.toLowerCase();
    const bodyLower = doubt.body.toLowerCase();
    const skillNames = doubt.skills.map((ds) => ds.skill.name.toLowerCase());
    const acceptedAnswer = doubt.answers.find((a) => a.isAccepted || a.id === doubt.acceptedAnswerId);
    const acceptedAnswerBody = acceptedAnswer?.body.toLowerCase() ?? "";

    if (rawQuery) {
      const qLower = rawQuery.toLowerCase();
      // Exact title or skill match
      if (titleLower === qLower || skillNames.includes(qLower)) {
        score += 100;
      } else if (titleLower.includes(qLower)) {
        score += 40;
      } else if (skillNames.some((s) => s.includes(qLower))) {
        score += 30;
      }

      if (bodyLower.includes(qLower)) {
        score += 15;
      }

      if (acceptedAnswerBody.includes(qLower)) {
        score += 20;
      }

      for (const term of searchTerms) {
        if (titleLower.includes(term)) score += 10;
        if (bodyLower.includes(term)) score += 5;
        if (acceptedAnswerBody.includes(term)) score += 5;
        if (skillNames.some((s) => s.includes(term))) score += 8;
      }
    } else {
      score += 10;
    }

    // Resolution bonus (verified accepted answer signal)
    if (doubt.status === "RESOLVED" && acceptedAnswer) {
      score += 50;
    }

    return { doubt, acceptedAnswer, score };
  });

  // Sort by score descending, then by createdAt descending
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.doubt.createdAt).getTime() - new Date(a.doubt.createdAt).getTime();
  });

  const total = scored.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = (page - 1) * limit;
  const paginatedItems = scored.slice(startIndex, startIndex + limit);

  const formattedDoubts = paginatedItems.map(({ doubt, acceptedAnswer }) => ({
    id: doubt.id,
    authorId: doubt.authorId,
    title: doubt.title,
    body: doubt.body,
    urgency: doubt.urgency,
    status: doubt.status,
    answerCount: doubt.answerCount,
    acceptedAnswerId: doubt.acceptedAnswerId,
    createdAt: doubt.createdAt.toISOString(),
    updatedAt: doubt.updatedAt.toISOString(),
    acceptedAnswer: acceptedAnswer
      ? {
          id: acceptedAnswer.id,
          body: acceptedAnswer.body,
          createdAt: acceptedAnswer.createdAt.toISOString(),
        }
      : null,
    author: {
      id: doubt.author.id,
      email: doubt.author.email,
      fullName: doubt.author.profile?.fullName || doubt.author.email.split("@")[0],
      branch: doubt.author.profile?.branch || null,
      section: doubt.author.profile?.section || null,
      graduationYear: doubt.author.profile?.graduationYear || null,
      avatarUrl: doubt.author.profile?.avatarUrl || null,
    },
    skills: doubt.skills.map((ds) => ({
      id: ds.skill.id,
      name: ds.skill.name,
      slug: ds.skill.slug,
    })),
  }));

  return {
    doubts: formattedDoubts,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
