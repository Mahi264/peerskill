"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Plus, ShieldCheck, Sparkles, X } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AlertBanner } from "@/components/ui/toast";
import { normalizeMitsDisplayName, parseMitsEmail } from "@/lib/mits-email";

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electrical Engineering",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Business Administration",
  "Mathematics & Computing",
  "Physics",
  "Other",
];

const SEED_SKILLS = [
  "C++",
  "Java",
  "Python",
  "React",
  "Node.js",
  "Data Structures",
  "Algorithms",
  "SQL",
  "Machine Learning",
  "Figma",
  "Git",
];

type LevelType = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MENTOR";

interface SelectedSkill {
  name: string;
  level: LevelType;
}

export default function OnboardingPage() {
  const router = useRouter();

  const [loadingInitial, setLoadingInitial] = React.useState(true);
  const [step, setStep] = React.useState<1 | 2>(1);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // User state
  const [userEmail, setUserEmail] = React.useState("");

  // Step 1 Profile state (Institutional Google Identity + Academic Choice)
  const [fullName, setFullName] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [department, setDepartment] = React.useState(DEPARTMENTS[0]);
  const [branch, setBranch] = React.useState("");

  // Step 2 Skills state (Mandatory 3+ skills, defaults level to INTERMEDIATE)
  const [skills, setSkills] = React.useState<SelectedSkill[]>([]);
  const [customSkillInput, setCustomSkillInput] = React.useState("");

  // Load existing profile/user data (Restore state for returning PENDING users)
  React.useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/");
          return;
        }

        const json = await res.json();
        const u = json?.data?.user;
        const email = u?.email || "";
        setUserEmail(email);

        // If user is already active, redirect to home
        if (u?.status === "ACTIVE") {
          router.replace("/home");
          return;
        }

        // If user is suspended, show error
        if (u?.status === "SUSPENDED") {
          setErrorMsg("Account is suspended.");
          return;
        }

        // Parse verified institutional email for branch and batch
        const parsed = parseMitsEmail(email);

        // Populate existing profile details if returning PENDING user
        let hasStep1Data = false;
        if (u?.profile) {
          if (u.profile.fullName) {
            setFullName(normalizeMitsDisplayName(u.profile.fullName));
          }
          if (u.profile.avatarUrl) {
            setAvatarUrl(u.profile.avatarUrl);
          }
          if (u.profile.department) {
            setDepartment(u.profile.department);
            hasStep1Data = true;
          }
          if (u.profile.branch) {
            setBranch(u.profile.branch);
          } else if (parsed.branchName) {
            setBranch(parsed.branchName);
          }
        } else {
          setFullName(normalizeMitsDisplayName(email.split("@")[0]));
          if (parsed.branchName) {
            setBranch(parsed.branchName);
          }
        }

        if (u?.userSkills && Array.isArray(u.userSkills) && u.userSkills.length > 0) {
          setSkills(
            u.userSkills.map((us: { name?: string; skill?: { name: string }; level: LevelType }) => ({
              name: us.name || us.skill?.name || "Skill",
              level: us.level || "INTERMEDIATE",
            })),
          );
        }

        // If user already saved Step 1 profile (department chosen), advance to Step 2
        if (hasStep1Data && u?.status === "PENDING") {
          setStep(2);
        }
      } catch {
        setErrorMsg("Failed to verify user session.");
      } finally {
        setLoadingInitial(false);
      }
    }

    loadUser();
  }, [router]);

  // Skill management helpers (Proficiency defaults to INTERMEDIATE)
  const handleAddSkill = (skillName: string, level: LevelType = "INTERMEDIATE") => {
    const clean = skillName.trim();
    if (!clean) return;

    if (skills.some((s) => s.name.toLowerCase() === clean.toLowerCase())) {
      return; // Prevent duplicate
    }

    setSkills((prev) => [...prev, { name: clean, level }]);
    setCustomSkillInput("");
  };

  const handleRemoveSkill = (skillName: string) => {
    setSkills((prev) => prev.filter((s) => s.name.toLowerCase() !== skillName.toLowerCase()));
  };

  const handleLevelChange = (skillName: string, level: LevelType) => {
    setSkills((prev) =>
      prev.map((s) => (s.name.toLowerCase() === skillName.toLowerCase() ? { ...s, level } : s)),
    );
  };

  // Step 1 Submit: Campus Identity & Department Selection
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!department) {
      setErrorMsg("Department selection is required.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department,
          branch: branch.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json?.error?.message || "Failed to save profile.");
        return;
      }

      setStep(2);
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2 Submit: Skills & Account Activation
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (skills.length < 3) {
      setErrorMsg("At least 3 skills are required to activate your campus profile.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/profiles/me/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: skills.map((s) => ({ name: s.name, level: s.level })),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json?.error?.message || "Failed to save skills.");
        return;
      }

      // Backend atomically updated user status to ACTIVE! Navigate to /home.
      router.push("/home");
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)] text-sm font-medium animate-pulse">
          <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
          <span>Verifying student account...</span>
        </div>
      </main>
    );
  }

  const remainingSkills = Math.max(0, 3 - skills.length);

  return (
    <main className="min-h-screen bg-[color:var(--color-bg)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] text-xs font-semibold">
            <Sparkles className="size-3.5" />
            Verified Campus Network
          </div>
          <h1 className="text-3xl font-extrabold text-[color:var(--color-text)] tracking-tight">
            PeerSkill Setup
          </h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            Account: <span className="font-semibold text-[color:var(--color-text)]">{userEmail}</span>
          </p>
        </div>

        {/* 2-Step Progress Indicator */}
        <div className="flex items-center justify-between max-w-md mx-auto relative px-4">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[color:var(--color-border)] -translate-y-1/2 -z-10" />

          {/* Step 1 Pill */}
          <div className="flex flex-col items-center gap-1.5 bg-[color:var(--color-bg)] px-2">
            <div
              className={`size-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step === 1
                  ? "bg-[color:var(--color-primary)] text-white ring-4 ring-[color:var(--color-primary)]/20"
                  : "bg-[color:var(--color-success)] text-white"
              }`}
            >
              {step > 1 ? <Check className="size-5" /> : "1"}
            </div>
            <span className="text-xs font-semibold text-[color:var(--color-text)]">Identity</span>
          </div>

          {/* Step 2 Pill */}
          <div className="flex flex-col items-center gap-1.5 bg-[color:var(--color-bg)] px-2">
            <div
              className={`size-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step === 2
                  ? "bg-[color:var(--color-primary)] text-white ring-4 ring-[color:var(--color-primary)]/20"
                  : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)]"
              }`}
            >
              2
            </div>
            <span className="text-xs font-semibold text-[color:var(--color-text-muted)]">Skills</span>
          </div>
        </div>

        {errorMsg && <AlertBanner variant="error" message={errorMsg} />}

        {/* STEP 1: Campus Identity */}
        {step === 1 && (() => {
          const parsedEmail = parseMitsEmail(userEmail);
          return (
            <Card className="p-6 sm:p-8 space-y-6 shadow-sm">
              <CardHeader className="p-0 border-b border-[color:var(--color-border)]/60 pb-4">
                <CardTitle className="text-xl">Step 1: Campus Identity</CardTitle>
                <p className="text-xs text-[color:var(--color-text-muted)] mt-1">
                  Your identity is verified through your institutional Google account. Confirm your department and program to continue.
                </p>
              </CardHeader>

              <CardContent className="p-0 pt-2 space-y-5">
                {/* Verified Identity Card */}
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/40 p-4 sm:p-5 flex items-start sm:items-center gap-4">
                  <Avatar name={fullName || userEmail.split("@")[0]} src={avatarUrl} size="lg" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-[color:var(--color-text)] truncate">
                        {fullName || userEmail.split("@")[0]}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                        <ShieldCheck className="size-3.5" />
                        Verified via Google
                      </span>
                    </div>
                    <p className="text-xs text-[color:var(--color-text-muted)]">
                      {userEmail}
                    </p>
                  </div>
                </div>

                {/* Auto-detected Academic Details Callout */}
                {(parsedEmail.batchYear || parsedEmail.branchName) && (
                  <div className="rounded-lg border border-[color:var(--color-primary)]/20 bg-[color:var(--color-surface-muted)]/30 px-4 py-3 space-y-1 text-xs text-[color:var(--color-text)]">
                    <span className="font-semibold text-[color:var(--color-primary)] uppercase tracking-wider text-[10px] block mb-1">
                      Detected from your MITS student ID:
                    </span>
                    {parsedEmail.batchYear && (
                      <p className="flex items-center gap-1.5">
                        <span className="text-[color:var(--color-text-muted)]">• Admission Batch:</span>
                        <span className="font-semibold">Class of {parsedEmail.batchYear}</span>
                      </p>
                    )}
                    {parsedEmail.branchName && (
                      <p className="flex items-center gap-1.5">
                        <span className="text-[color:var(--color-text-muted)]">• Detected Program:</span>
                        <span className="font-semibold">{parsedEmail.branchName}</span>
                      </p>
                    )}
                  </div>
                )}

                <form onSubmit={handleStep1Submit} className="space-y-5 pt-2">
                  {/* Department (Required) */}
                  <div className="space-y-1.5">
                    <label htmlFor="department" className="text-sm font-semibold text-[color:var(--color-text)]">
                      Department <span className="text-[color:var(--color-danger)]">*</span>
                    </label>
                    <Select
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={submitting}
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </Select>
                    <p className="text-[11px] text-[color:var(--color-text-muted)]">
                      Select your primary academic department.
                    </p>
                  </div>

                  {/* Branch / Program (Optional / Auto-populated) */}
                  <div className="space-y-1.5">
                    <label htmlFor="branch" className="text-sm font-semibold text-[color:var(--color-text)]">
                      Branch / Program
                    </label>
                    <Input
                      id="branch"
                      placeholder="e.g. Computer Science & Engineering (CSE)"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      disabled={submitting}
                    />
                    <p className="text-[11px] text-[color:var(--color-text-muted)]">
                      {parsedEmail.branchName
                        ? "Auto-detected from your MITS student email (editable if needed)."
                        : "Could not be automatically detected from your email. Please select or enter your branch."}
                    </p>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" size="lg" disabled={submitting}>
                      <span className="flex items-center gap-2">
                        {submitting ? "Saving..." : "Continue to Skills"}
                        <ArrowRight className="size-4" />
                      </span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          );
        })()}

        {/* STEP 2: Skills & Activation */}
        {step === 2 && (
          <Card className="p-6 sm:p-8 space-y-6 shadow-sm">
            <CardHeader className="p-0 border-b border-[color:var(--color-border)]/60 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl">Step 2: Declare Your Skills</CardTitle>
                  <p className="text-xs text-[color:var(--color-text-muted)] mt-1">
                    Select at least 3 skills you know or are studying to unlock your campus feed.
                  </p>
                </div>

                <Badge variant={skills.length >= 3 ? "success" : "warning"} className="text-xs px-2.5 py-1">
                  {skills.length >= 3 ? "Ready for Activation ✓" : `${remainingSkills} more required`}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 pt-2 space-y-6">
              <form onSubmit={handleStep2Submit} className="space-y-6">
                {/* Seed Chips */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                    Quick-Add Campus Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SEED_SKILLS.map((seedName) => {
                      const isSelected = skills.some(
                        (s) => s.name.toLowerCase() === seedName.toLowerCase(),
                      );
                      return (
                        <button
                          key={seedName}
                          type="button"
                          disabled={submitting}
                          onClick={() => {
                            if (isSelected) {
                              handleRemoveSkill(seedName);
                            } else {
                              handleAddSkill(seedName, "INTERMEDIATE");
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            isSelected
                              ? "bg-[color:var(--color-primary)] text-white shadow-sm"
                              : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-text)] border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/40"
                          }`}
                        >
                          {isSelected ? <Check className="size-3" /> : <Plus className="size-3" />}
                          <span>{seedName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Skill Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a custom skill..."
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    disabled={submitting}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill(customSkillInput, "INTERMEDIATE");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting || !customSkillInput.trim()}
                    onClick={() => handleAddSkill(customSkillInput, "INTERMEDIATE")}
                  >
                    Add Skill
                  </Button>
                </div>

                {/* Selected Skills List */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                    Selected Skills ({skills.length})
                  </p>

                  {skills.length === 0 ? (
                    <div className="p-4 text-center rounded-xl border border-dashed text-xs text-[color:var(--color-text-muted)]">
                      No skills selected yet. Click skills above or type custom skills.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {skills.map((s) => (
                        <div
                          key={s.name}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[color:var(--color-border)] bg-white shadow-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="skill">{s.name}</Badge>
                          </div>

                          <div className="flex items-center gap-3">
                            <Select
                              className="h-8 text-xs w-32 font-medium"
                              value={s.level}
                              onChange={(e) => handleLevelChange(s.name, e.target.value as LevelType)}
                              disabled={submitting}
                            >
                              <option value="BEGINNER">BEGINNER</option>
                              <option value="INTERMEDIATE">INTERMEDIATE</option>
                              <option value="ADVANCED">ADVANCED</option>
                              <option value="MENTOR">MENTOR</option>
                            </Select>

                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(s.name)}
                              disabled={submitting}
                              className="text-[color:var(--color-text-muted)] hover:text-[color:var(--color-danger)] transition-colors p-1"
                              title="Remove skill"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-[color:var(--color-border)]/60">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={submitting}
                  >
                    <ArrowLeft className="size-4 mr-1.5" />
                    Back
                  </Button>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting || skills.length < 3}
                  >
                    <span className="flex items-center gap-2">
                      {submitting ? "Activating Account..." : "Complete & Enter PeerSkill"}
                      <ArrowRight className="size-4" />
                    </span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
