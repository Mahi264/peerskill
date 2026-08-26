import * as React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { StudentAuthProvider } from "@/components/auth/student-auth-context";
import { AppShell } from "@/components/shell/app-shell";
import { findValidAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { findValidSession, SESSION_COOKIE_NAME } from "@/lib/session";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    redirect("/");
  }

  // Check if admin is trying to access student routes
  const adminSession = await findValidAdminSession(rawToken);
  if (adminSession && adminSession.adminAccount) {
    redirect("/admin");
  }

  const studentSession = await findValidSession(rawToken);
  if (!studentSession || !studentSession.user) {
    redirect("/");
  }

  if (studentSession.user.status === "PENDING") {
    redirect("/onboarding");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: studentSession.user.id },
  });

  const userSkills = await prisma.userSkill.findMany({
    where: { userId: studentSession.user.id },
    include: { skill: true },
  });

  const initialUser = {
    id: studentSession.user.id,
    email: studentSession.user.email,
    status: studentSession.user.status,
  };

  const initialProfile = profile
    ? {
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        branch: profile.branch,
        graduationYear: profile.graduationYear,
        section: profile.section,
        bio: profile.bio,
        helpAvailable: profile.helpAvailable,
        helpStatus: profile.helpStatus,
        contactVisibility: profile.contactVisibility,
        chatRequestVisibility: profile.chatRequestVisibility,
      }
    : null;

  const initialSkills = userSkills.map((us) => ({
    id: us.id,
    name: us.skill.name,
    slug: us.skill.slug,
    level: us.level,
  }));

  return (
    <StudentAuthProvider
      initialUser={initialUser}
      initialProfile={initialProfile}
      initialSkills={initialSkills}
    >
      <AppShell>{children}</AppShell>
    </StudentAuthProvider>
  );
}
