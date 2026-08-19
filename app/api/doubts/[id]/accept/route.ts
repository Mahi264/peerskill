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

function forbiddenResponse(message = "Only the doubt author can accept an answer.") {
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

  if (doubt.authorId !== user.id) {
    return forbiddenResponse("Only the doubt author can accept an answer.");
  }

  if (doubt.status === "CLOSED") {
    return NextResponse.json(
      {
        error: {
          code: "DOUBT_CLOSED",
          message: "Cannot accept an answer for a closed doubt.",
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

  const { answerId } = bodyData || {};

  if (!answerId || typeof answerId !== "string" || !answerId.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_ANSWER_ID",
          message: "A valid answerId must be provided.",
        },
      },
      { status: 400 },
    );
  }

  const answer = await prisma.answer.findFirst({
    where: {
      id: answerId.trim(),
      doubtId: doubt.id,
    },
  });

  if (!answer) {
    return NextResponse.json(
      {
        error: {
          code: "ANSWER_NOT_FOUND",
          message: "Answer not found for this doubt.",
        },
      },
      { status: 404 },
    );
  }

  const [, updatedAnswer, updatedDoubt] = await prisma.$transaction([
    prisma.answer.updateMany({
      where: {
        doubtId: doubt.id,
        isAccepted: true,
      },
      data: {
        isAccepted: false,
      },
    }),
    prisma.answer.update({
      where: {
        id: answer.id,
      },
      data: {
        isAccepted: true,
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
                avatarUrl: true,
              },
            },
          },
        },
      },
    }),
    prisma.doubt.update({
      where: {
        id: doubt.id,
      },
      data: {
        status: "RESOLVED",
        acceptedAnswerId: answer.id,
      },
    }),
  ]);

  return NextResponse.json(
    {
      data: {
        doubt: {
          id: updatedDoubt.id,
          status: updatedDoubt.status,
          acceptedAnswerId: updatedDoubt.acceptedAnswerId,
          updatedAt: updatedDoubt.updatedAt.toISOString(),
        },
        answer: {
          id: updatedAnswer.id,
          doubtId: updatedAnswer.doubtId,
          authorId: updatedAnswer.authorId,
          body: updatedAnswer.body,
          isAccepted: updatedAnswer.isAccepted,
          createdAt: updatedAnswer.createdAt.toISOString(),
          updatedAt: updatedAnswer.updatedAt.toISOString(),
          author: {
            id: updatedAnswer.author.id,
            email: updatedAnswer.author.email,
            fullName: updatedAnswer.author.profile?.fullName || updatedAnswer.author.email.split("@")[0],
            department: updatedAnswer.author.profile?.department || "",
            avatarUrl: updatedAnswer.author.profile?.avatarUrl || null,
          },
        },
      },
    },
    { status: 200 },
  );
}
