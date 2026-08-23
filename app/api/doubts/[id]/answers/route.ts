import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function forbiddenResponse(message = "Only active verified students can submit answers.") {
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthenticatedResponse();
  }

  if (user.status !== "ACTIVE") {
    return forbiddenResponse();
  }

  const { id: doubtId } = await params;

  if (!doubtId) {
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
    where: { id: doubtId },
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

  if (doubt.status === "CLOSED") {
    return NextResponse.json(
      {
        error: {
          code: "DOUBT_CLOSED",
          message: "Cannot submit an answer to a closed doubt.",
        },
      },
      { status: 400 },
    );
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

  const { body } = bodyData || {};

  if (!body || typeof body !== "string" || body.trim().length < 5) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BODY",
          message: "Answer body must be at least 5 characters long.",
        },
      },
      { status: 400 },
    );
  }

  const [answer] = await prisma.$transaction([
    prisma.answer.create({
      data: {
        doubtId: doubt.id,
        authorId: user.id,
        body: body.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                department: true,
                branch: true,
                section: true,
                graduationYear: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    }),
    prisma.doubt.update({
      where: { id: doubt.id },
      data: { answerCount: { increment: 1 } },
    }),
  ]);

  return NextResponse.json(
    {
      data: {
        answer: {
          id: answer.id,
          doubtId: answer.doubtId,
          authorId: answer.authorId,
          body: answer.body,
          isAccepted: answer.isAccepted,
          createdAt: answer.createdAt.toISOString(),
          updatedAt: answer.updatedAt.toISOString(),
          author: {
            id: answer.author.id,
            email: answer.author.email,
            fullName: answer.author.profile?.fullName || answer.author.email.split("@")[0],
            department: answer.author.profile?.department || "",
            branch: answer.author.profile?.branch || null,
            section: answer.author.profile?.section || null,
            graduationYear: answer.author.profile?.graduationYear || null,
            avatarUrl: answer.author.profile?.avatarUrl || null,
          },
        },
      },
    },
    { status: 201 },
  );
}
