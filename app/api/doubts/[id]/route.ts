import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      {
        error: {
          code: "DOUBT_NOT_FOUND",
          message: "Doubt not found.",
        },
      },
      { status: 404 },
    );
  }

  const doubt = await prisma.doubt.findUnique({
    where: { id },
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
      answers: {
        orderBy: [{ isAccepted: "desc" }, { createdAt: "asc" }],
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
        },
      },
    },
  });

  if (!doubt) {
    return NextResponse.json(
      {
        error: {
          code: "DOUBT_NOT_FOUND",
          message: "Doubt not found.",
        },
      },
      { status: 404 },
    );
  }

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
          answers: doubt.answers.map((ans) => ({
            id: ans.id,
            doubtId: ans.doubtId,
            authorId: ans.authorId,
            body: ans.body,
            isAccepted: ans.isAccepted,
            createdAt: ans.createdAt.toISOString(),
            updatedAt: ans.updatedAt.toISOString(),
            author: {
              id: ans.author.id,
              email: ans.author.email,
              fullName: ans.author.profile?.fullName || ans.author.email.split("@")[0],
              branch: ans.author.profile?.branch || null,
              section: ans.author.profile?.section || null,
              graduationYear: ans.author.profile?.graduationYear || null,
              avatarUrl: ans.author.profile?.avatarUrl || null,
            },
          })),
        },
      },
    },
    { status: 200 },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
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

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      {
        error: {
          code: "DOUBT_NOT_FOUND",
          message: "Doubt not found.",
        },
      },
      { status: 404 },
    );
  }

  const doubt = await prisma.doubt.findUnique({
    where: { id },
    include: {
      answers: { select: { id: true } },
    },
  });

  if (!doubt) {
    return NextResponse.json(
      {
        error: {
          code: "DOUBT_NOT_FOUND",
          message: "Doubt not found.",
        },
      },
      { status: 404 },
    );
  }

  if (doubt.authorId !== user.id) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Only the doubt author can delete this doubt.",
        },
      },
      { status: 403 },
    );
  }

  if (doubt.status !== "OPEN") {
    return NextResponse.json(
      {
        error: {
          code: "DOUBT_NOT_OPEN",
          message: "Only open doubts can be deleted.",
        },
      },
      { status: 400 },
    );
  }

  if (doubt.answerCount > 0 || doubt.answers.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: "DOUBT_HAS_ANSWERS",
          message: "Cannot delete a doubt that has answers.",
        },
      },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.doubtSkill.deleteMany({ where: { doubtId: doubt.id } }),
    prisma.doubt.delete({ where: { id: doubt.id } }),
  ]);

  return NextResponse.json(
    {
      data: {
        deleted: true,
        id: doubt.id,
      },
    },
    { status: 200 },
  );
}
