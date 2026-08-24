import { NextResponse } from "next/server";
import { type Prisma, type UserStatus } from "@prisma/client";

import { getAuthenticatedAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await getAuthenticatedAdmin(request);
  if (!admin) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Administrative access required.",
        },
      },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const statusParam = searchParams.get("status")?.trim().toUpperCase();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (statusParam && ["ACTIVE", "PENDING", "SUSPENDED"].includes(statusParam)) {
    where.status = statusParam as UserStatus;
  }

  if (q) {
    where.OR = [
      { email: { contains: q } },
      { profile: { fullName: { contains: q } } },
      { profile: { branch: { contains: q } } },
    ];
  }

  try {
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          status: true,
          createdAt: true,
          profile: {
            select: {
              fullName: true,
              branch: true,
              section: true,
              graduationYear: true,
            },
          },
          _count: {
            select: {
              doubts: true,
              answers: true,
              userSkills: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const students = users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.profile?.fullName || u.email.split("@")[0],
      branch: u.profile?.branch || null,
      section: u.profile?.section || null,
      graduationYear: u.profile?.graduationYear || null,
      status: u.status,
      doubtsCount: u._count.doubts,
      answersCount: u._count.answers,
      skillsCount: u._count.userSkills,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        data: {
          students,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Admin students query error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load student directory.",
        },
      },
      { status: 500 },
    );
  }
}
