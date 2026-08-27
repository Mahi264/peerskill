"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { clearAllCache } from "@/lib/data-cache";

export interface StudentUser {
  id: string;
  email: string;
  status: string;
}

export interface StudentProfile {
  fullName: string;
  avatarUrl?: string | null;
  branch?: string | null;
  graduationYear?: number | null;
  section?: string | null;
  bio?: string | null;
  helpAvailable: boolean;
  helpStatus?: string | null;
  contactVisibility?: string;
  chatRequestVisibility?: string;
}

export interface StudentSkill {
  id: string;
  name: string;
  slug: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MENTOR";
}

interface StudentAuthContextValue {
  user: StudentUser | null;
  profile: StudentProfile | null;
  skills: StudentSkill[];
  loading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const StudentAuthContext = React.createContext<StudentAuthContextValue | null>(null);

export interface StudentAuthProviderProps {
  children?: React.ReactNode;
  initialUser: StudentUser | null;
  initialProfile: StudentProfile | null;
  initialSkills?: StudentSkill[];
}

export function StudentAuthProvider({
  children,
  initialUser,
  initialProfile,
  initialSkills = [],
}: StudentAuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = React.useState<StudentUser | null>(initialUser);
  const [profile, setProfile] = React.useState<StudentProfile | null>(initialProfile);
  const [skills, setSkills] = React.useState<StudentSkill[]>(initialSkills);
  const [loading, setLoading] = React.useState(false);

  // Clear domain cache whenever student identity changes
  const prevUserIdRef = React.useRef(initialUser?.id);
  React.useEffect(() => {
    if (user?.id !== prevUserIdRef.current) {
      clearAllCache();
      prevUserIdRef.current = user?.id;
    }
  }, [user?.id]);

  const refreshAuth = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        clearAllCache();
        router.replace("/");
        return;
      }

      const json = await res.json();
      const u = json?.data?.user;
      if (u) {
        setUser({
          id: u.id,
          email: u.email,
          status: u.status,
        });
        if (u.profile) {
          setProfile({
            fullName: u.profile.fullName || "",
            avatarUrl: u.profile.avatarUrl || null,
            branch: u.profile.branch || null,
            section: u.profile.section || null,
            graduationYear: u.profile.graduationYear || null,
            bio: u.profile.bio || null,
            helpAvailable: u.profile.helpAvailable ?? true,
            helpStatus: u.profile.helpStatus || null,
          });
        }
        if (Array.isArray(u.skills)) {
          setSkills(
            u.skills.map((s: { id: string; name: string; slug: string; level: string }) => ({
              id: s.id,
              name: s.name,
              slug: s.slug,
              level: s.level,
            })),
          );
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = React.useCallback(async () => {
    try {
      clearAllCache();
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearAllCache();
      router.replace("/");
    }
  }, [router]);

  const value = React.useMemo<StudentAuthContextValue>(
    () => ({
      user,
      profile,
      skills,
      loading,
      refreshAuth,
      logout,
    }),
    [user, profile, skills, loading, refreshAuth, logout],
  );

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth(): StudentAuthContextValue {
  const context = React.useContext(StudentAuthContext);
  if (!context) {
    throw new Error("useStudentAuth must be used within a StudentAuthProvider");
  }
  return context;
}
