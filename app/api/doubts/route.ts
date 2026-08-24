import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSkillSlug } from "@/lib/skills";

const VALID_URGENCIES = ["CURIOUS", "ASSIGNMENT_STUCK", "PROJECT_BLOCKED", "EXAM_PREP"] as const;
type DoubtUrgencyType = (typeof VALID_URGENCIES)[number];
type DoubtStatusType = "OPEN" | "RESOLVED" | "CLOSED";

function unauthenticatedResponse() {
  return NextResponse.json(
    {
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
      },
    },
    { status: 401 },
  );
}

function forbiddenResponse(message = "Only active verified students can post doubts.") {
  return NextResponse.json(
    {
      error: {
        code: "FORBIDDEN",
        message,
      },
    },
    { status: 403 },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const skillQuery = searchParams.get("skill")?.trim();
  const urgencyQuery = searchParams.get("urgency")?.trim();
  const statusQuery = searchParams.get("status")?.trim();
  const limitParam = Number.parseInt(searchParams.get("limit") || "20", 10);
  const offsetParam = Number.parseInt(searchParams.get("offset") || "0", 10);

  const limit = Math.max(1, Math.min(isNaN(limitParam) ? 20 : limitParam, 100));
  const offset = Math.max(0, isNaN(offsetParam) ? 0 : offsetParam);

  const where: Prisma.DoubtWhereInput = {};

  if (urgencyQuery && VALID_URGENCIES.includes(urgencyQuery as DoubtUrgencyType)) {
    where.urgency = urgencyQuery as DoubtUrgencyType;
  }

  if (statusQuery && ["OPEN", "RESOLVED", "CLOSED"].includes(statusQuery.toUpperCase())) {
    where.status = statusQuery.toUpperCase() as DoubtStatusType;
  }

  if (skillQuery) {
    where.skills = {
      some: {
        skill: {
          OR: [
            { id: skillQuery },
            { slug: skillQuery.toLowerCase() },
            { name: { equals: skillQuery } },
          ],
        },
      },
    };
  }

  const [doubts, total] = await Promise.all([
    prisma.doubt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        author: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                avatarUrl: true,
                branch: true,
                section: true,
                graduationYear: true,
              },
            },
          },
        },
        skills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
    prisma.doubt.count({ where }),
  ]);

  const formattedDoubts = doubts.map((d) => ({
    id: d.id,
    authorId: d.authorId,
    title: d.title,
    body: d.body,
    urgency: d.urgency,
    status: d.status,
    answerCount: d.answerCount,
    acceptedAnswerId: d.acceptedAnswerId,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    author: {
      id: d.author.id,
      email: d.author.email,
      fullName: d.author.profile?.fullName || d.author.email.split("@")[0],
      branch: d.author.profile?.branch || null,
      section: d.author.profile?.section || null,
      graduationYear: d.author.profile?.graduationYear || null,
      avatarUrl: d.author.profile?.avatarUrl || null,
    },
    skills: d.skills.map((ds) => ({
      id: ds.skill.id,
      name: ds.skill.name,
      slug: ds.skill.slug,
    })),
  }));

  return NextResponse.json(
    {
      data: {
        doubts: formattedDoubts,
        total,
        limit,
        offset,
      },
    },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthenticatedResponse();
  }

  if (user.status !== "ACTIVE") {
    return forbiddenResponse();
  }

  let bodyData: Record<string, unknown>;
  try {
    bodyData = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  const { title, body, urgency = "CURIOUS", skillIds, skills: rawSkills } = bodyData || {};

  if (!title || typeof title !== "string" || title.trim().length < 5) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TITLE",
          message: "Title must be at least 5 characters long.",
        },
      },
      { status: 400 },
    );
  }

  if (title.trim().length > 200) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TITLE",
          message: "Title cannot exceed 200 characters.",
        },
      },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "string" || body.trim().length < 10) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "Description body must be at least 10 characters long.",
        },
      },
      { status: 400 },
    );
  }

  const formattedUrgency = typeof urgency === "string" ? urgency.toUpperCase() : "CURIOUS";
  if (!VALID_URGENCIES.includes(formattedUrgency as DoubtUrgencyType)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_URGENCY",
          message: "Urgency must be one of: CURIOUS, ASSIGNMENT_STUCK, PROJECT_BLOCKED, EXAM_PREP.",
        },
      },
      { status: 400 },
    );
  }

  const skillInputs: string[] = Array.isArray(skillIds)
    ? skillIds
    : Array.isArray(rawSkills)
      ? rawSkills
      : [];

  if (skillInputs.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "SKILLS_REQUIRED",
          message: "At least one skill tag must be selected.",
        },
      },
      { status: 400 },
    );
  }

  // Resolve skills from database or create matching skills
  const resolvedSkillIds: string[] = [];
  for (const input of skillInputs) {
    if (typeof input !== "string" || !input.trim()) continue;
    const cleanInput = input.trim();
    const slug = generateSkillSlug(cleanInput);

    let existingSkill = await prisma.skill.findFirst({
      where: {
        OR: [{ id: cleanInput }, { slug }, { name: { equals: cleanInput } }],
      },
    });

    if (!existingSkill) {
      try {
        existingSkill = await prisma.skill.create({
          data: {
            name: cleanInput,
            slug,
          },
        });
      } catch {
        existingSkill = await prisma.skill.findFirst({
          where: {
            OR: [{ id: cleanInput }, { slug }, { name: { equals: cleanInput } }],
          },
        });
      }
    }

    if (existingSkill && !resolvedSkillIds.includes(existingSkill.id)) {
      resolvedSkillIds.push(existingSkill.id);
    }
  }

  if (resolvedSkillIds.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "SKILLS_REQUIRED",
          message: "At least one valid skill tag must be provided.",
        },
      },
      { status: 400 },
    );
  }

  const doubt = await prisma.doubt.create({
    data: {
      authorId: user.id,
      title: title.trim(),
      body: body.trim(),
      urgency: formattedUrgency as DoubtUrgencyType,
      status: "OPEN",
      skills: {
        create: resolvedSkillIds.map((sId) => ({ skillId: sId })),
      },
    },
    include: {
      author: {
        select: {
          id: true,
          email: true,
          profile: {
            select: {
              fullName: true,
              branch: true,
              section: true,
              graduationYear: true,
              avatarUrl: true,
            },
          },
        },
      },
      skills: {
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(
    {
      data: {
        doubt: {
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
        },
      },
    },
    { status: 201 },
  );
}
