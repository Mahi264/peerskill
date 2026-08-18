"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Plus, Shield, Sparkles, X } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertBanner } from "@/components/ui/toast";

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
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // User state
  const [userEmail, setUserEmail] = React.useState("");

  // Step 1 Profile state
  const [fullName, setFullName] = React.useState("");
  const [department, setDepartment] = React.useState(DEPARTMENTS[0]);
  const [branch, setBranch] = React.useState("");
  const [graduationYear, setGraduationYear] = React.useState<number | "">(2027);
  const [section, setSection] = React.useState("");
  const [bio, setBio] = React.useState("");

  // Step 2 Skills state
  const [skills, setSkills] = React.useState<SelectedSkill[]>([]);
  const [customSkillInput, setCustomSkillInput] = React.useState("");

  // Step 3 Preferences state
  const [helpAvailable, setHelpAvailable] = React.useState(true);
  const [helpStatus, setHelpStatus] = React.useState("");
  const [contactVisibility, setContactVisibility] = React.useState<"NOBODY" | "CONNECTIONS" | "COLLEGE">("CONNECTIONS");
  const [chatRequestVisibility, setChatRequestVisibility] = React.useState<"NOBODY" | "CONNECTIONS" | "COLLEGE">("CONNECTIONS");

  // Load existing profile/user data
  React.useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const json = await res.json();
        const u = json?.data?.user;
        setUserEmail(u?.email || "");

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

        // Populate any existing profile details
        if (u?.profile) {
          if (u.profile.fullName) setFullName(u.profile.fullName);
          if (u.profile.department) setDepartment(u.profile.department);
          if (u.profile.branch) setBranch(u.profile.branch);
          if (u.profile.graduationYear) setGraduationYear(u.profile.graduationYear);
          if (u.profile.section) setSection(u.profile.section);
          if (u.profile.bio) setBio(u.profile.bio);
          if (u.profile.helpAvailable !== undefined) setHelpAvailable(u.profile.helpAvailable);
          if (u.profile.helpStatus) setHelpStatus(u.profile.helpStatus);
        }

        if (u?.userSkills && Array.isArray(u.userSkills) && u.userSkills.length > 0) {
          setSkills(
            u.userSkills.map((us: { name?: string; skill?: { name: string }; level: LevelType }) => ({
              name: us.name || us.skill?.name || "Skill",
              level: us.level,
            })),
          );
        }
      } catch {
        setErrorMsg("Failed to verify user session.");
      } finally {
        setLoadingInitial(false);
      }
    }

    loadUser();
  }, [router]);

  // Skill management helpers
  const handleAddSkill = (skillName: string, level: LevelType = "BEGINNER") => {
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

  // Submit Handlers for each step
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }

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
          fullName: fullName.trim(),
          department,
          branch: branch.trim() || undefined,
          graduationYear: graduationYear ? Number(graduationYear) : undefined,
          section: section.trim() || undefined,
          bio: bio.trim() || undefined,
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

      // Backend atomically updated user status to ACTIVE!
      setStep(3);
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    setSubmitting(true);

    try {
      // Save availability
      await fetch("/api/profiles/me/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          helpAvailable,
          helpStatus: helpStatus.trim() || null,
        }),
      });

      // Save privacy
      await fetch("/api/profiles/me/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactVisibility,
          chatRequestVisibility,
        }),
      });

      // Navigate to Home after completing onboarding
      router.push("/home");
    } catch {
      // If Step 3 fails, user is already ACTIVE so proceed to home anyway
      router.push("/home");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)] text-sm font-medium animate-pulse">
          <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
          <span>Loading onboarding wizard...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--color-bg)] flex flex-col items-center py-8 px-4 sm:px-6">
      {/* Top Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-[color:var(--color-primary)] text-white font-bold text-base shadow-sm">
            P
          </div>
          <span className="text-lg font-bold tracking-tight text-[color:var(--color-text)]">
            PeerSkill
          </span>
        </Link>

        <span className="text-xs text-[color:var(--color-text-muted)] font-medium">
          {userEmail}
        </span>
      </div>

      {/* Signature 3-Node Progress Stepper */}
      <div className="w-full max-w-2xl mb-8">
        <div className="relative flex items-center justify-between px-4">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-[color:var(--color-border)] -z-0" />
          <div
            className="absolute top-1/2 left-8 -translate-y-1/2 h-0.5 bg-[color:var(--color-primary)] transition-all duration-320 -z-0"
            style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
          />

          {/* Node 1 */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-[color:var(--color-bg)] px-2">
            <div
              className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step >= 1
                  ? "bg-[color:var(--color-primary)] text-white ring-4 ring-[color:var(--color-primary)]/15"
                  : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)]"
              }`}
            >
              {step > 1 ? <Check className="size-4" /> : "1"}
            </div>
            <span className="text-xs font-medium text-[color:var(--color-text-muted)] hidden sm:inline">
              Academic Profile
            </span>
          </div>

          {/* Node 2 */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-[color:var(--color-bg)] px-2">
            <div
              className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step >= 2
                  ? "bg-[color:var(--color-primary)] text-white ring-4 ring-[color:var(--color-primary)]/15"
                  : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)]"
              }`}
            >
              {step > 2 ? <Check className="size-4" /> : "2"}
            </div>
            <span className="text-xs font-medium text-[color:var(--color-text-muted)] hidden sm:inline">
              Skills & Levels
            </span>
          </div>

          {/* Node 3 */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-[color:var(--color-bg)] px-2">
            <div
              className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step >= 3
                  ? "bg-[color:var(--color-primary)] text-white ring-4 ring-[color:var(--color-primary)]/15"
                  : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)]"
              }`}
            >
              &quot;3&quot;
            </div>
            <span className="text-xs font-medium text-[color:var(--color-text-muted)] hidden sm:inline">
              Help Preferences
            </span>
          </div>
        </div>
      </div>

      {/* Main Wizard Form Card */}
      <Card className="w-full max-w-2xl border-[color:var(--color-border)] shadow-[var(--shadow-md)] rounded-[var(--radius-lg)]">
        <CardHeader className="space-y-1 pb-4 border-b border-[color:var(--color-border)]/60">
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            {step === 1 && "Step 1: Academic & Cohort Profile"}
            {step === 2 && "Step 2: Declare Your Top Skills"}
            {step === 3 && "Step 3: Availability & Privacy Preferences"}
          </CardTitle>
          <p className="text-xs sm:text-sm text-[color:var(--color-text-muted)]">
            {step === 1 && "Tell your campus who you are and where you study."}
            {step === 2 && "Add at least 3 skills and self-rate your proficiency to activate your account."}
            {step === 3 && "Set your help availability and control contact visibility."}
          </p>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {errorMsg && <AlertBanner variant="error" message={errorMsg} />}

          {/* STEP 1: Academic Profile */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-5">
              {/* Initials Avatar Preview */}
              <div className="flex items-center gap-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/40 p-4">
                <Avatar name={fullName || "Student"} department={department} size="lg" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-primary)]">
                    Initials Avatar Preview
                  </p>
                  <p className="text-sm font-semibold text-[color:var(--color-text)]">
                    {fullName || "Your Full Name"}
                  </p>
                  <p className="text-xs text-[color:var(--color-text-muted)]">
                    {department} • Ring Accent
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="fullName" className="text-sm font-medium text-[color:var(--color-text)]">
                    Full Name <span className="text-[color:var(--color-danger)]">*</span>
                  </label>
                  <Input
                    id="fullName"
                    placeholder="e.g. Aarav Mehta"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="department" className="text-sm font-medium text-[color:var(--color-text)]">
                    Department <span className="text-[color:var(--color-danger)]">*</span>
                  </label>
                  <Select
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={submitting}
                    required
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="branch" className="text-sm font-medium text-[color:var(--color-text)]">
                    Branch (Optional)
                  </label>
                  <Input
                    id="branch"
                    placeholder="e.g. CSE / ECE"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="graduationYear" className="text-sm font-medium text-[color:var(--color-text)]">
                    Graduation Year (Optional)
                  </label>
                  <Input
                    id="graduationYear"
                    type="number"
                    placeholder="2027"
                    min={2000}
                    max={2100}
                    value={graduationYear}
                    onChange={(e) =>
                      setGraduationYear(e.target.value ? Number(e.target.value) : "")
                    }
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="section" className="text-sm font-medium text-[color:var(--color-text)]">
                    Section (Optional)
                  </label>
                  <Input
                    id="section"
                    placeholder="e.g. A / B"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="bio" className="text-sm font-medium text-[color:var(--color-text)]">
                    Short Bio (Optional)
                  </label>
                  <span className="text-xs text-[color:var(--color-text-muted)]">
                    {bio.length}/500
                  </span>
                </div>
                <Textarea
                  id="bio"
                  placeholder="Share your interests, active projects, or what you like helping with..."
                  maxLength={500}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={submitting}
                  rows={3}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" size="lg" disabled={submitting}>
                  {submitting ? (
                    <span>Saving...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Continue to Skills
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2: Skills & Levels (Activation Gate) */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              {/* Skill Count Indicator Badge */}
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/50 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-[color:var(--color-primary)]" />
                  <span className="text-sm font-semibold text-[color:var(--color-text)]">
                    Activation Progress
                  </span>
                </div>
                <Badge
                  variant={skills.length >= 3 ? "success" : "warning"}
                  className="text-xs px-3 py-1"
                >
                  {skills.length} of 3 skills added
                </Badge>
              </div>

              {/* Seed Skills Quick Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  Quick-Add Campus Skills
                </label>
                <div className="flex flex-wrap gap-2">
                  {SEED_SKILLS.map((seedName) => {
                    const isAdded = skills.some(
                      (s) => s.name.toLowerCase() === seedName.toLowerCase(),
                    );
                    return (
                      <button
                        key={seedName}
                        type="button"
                        onClick={() =>
                          isAdded ? handleRemoveSkill(seedName) : handleAddSkill(seedName)
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          isAdded
                            ? "bg-[color:var(--color-primary)] text-white shadow-sm"
                            : "border border-[color:var(--color-border)] bg-white text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)]"
                        }`}
                      >
                        {isAdded ? <Check className="size-3" /> : <Plus className="size-3" />}
                        <span>{seedName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Skill Input */}
              <div className="space-y-2">
                <label htmlFor="customSkill" className="text-sm font-medium text-[color:var(--color-text)]">
                  Add Custom Skill
                </label>
                <div className="flex gap-2">
                  <Input
                    id="customSkill"
                    placeholder="e.g. Docker, Rust, System Design..."
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill(customSkillInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddSkill(customSkillInput)}
                  >
                    Add Tag
                  </Button>
                </div>
              </div>

              {/* Added Skills List & Proficiency Level Pickers */}
              <div className="space-y-3 pt-2">
                <label className="text-sm font-semibold text-[color:var(--color-text)]">
                  Selected Skills ({skills.length})
                </label>

                {skills.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-6 text-center text-sm text-[color:var(--color-text-muted)]">
                    No skills added yet. Click quick-add chips above or type a custom skill.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {skills.map((skill) => (
                      <div
                        key={skill.name}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--color-border)] bg-white p-3 shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="skill">{skill.name}</Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={skill.level}
                            onChange={(e) =>
                              handleLevelChange(skill.name, e.target.value as LevelType)
                            }
                            className="h-9 text-xs font-medium w-36 px-2.5 py-1 flex items-center leading-normal"
                          >
                            <option value="BEGINNER">Beginner</option>
                            <option value="INTERMEDIATE">Intermediate</option>
                            <option value="ADVANCED">Advanced</option>
                            <option value="MENTOR">Mentor</option>
                          </Select>

                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill.name)}
                            className="text-[color:var(--color-text-muted)] hover:text-[color:var(--color-danger)] p-1"
                            aria-label={`Remove ${skill.name}`}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2 Action Buttons */}
              <div className="pt-4 flex justify-between items-center border-t border-[color:var(--color-border)]/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting || skills.length < 3}
                >
                  {submitting ? (
                    <span>Activating account...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Save Skills & Activate
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: Help Preferences & Privacy */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              {/* Account Activated Success Banner */}
              <AlertBanner
                variant="success"
                title="Account Activated!"
                message="Your profile and skills have been saved. Customize your help availability and privacy options below."
              />

              {/* Help Availability Toggle */}
              <div className="space-y-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--color-text)]">
                      Available to Help Peers
                    </p>
                    <p className="text-xs text-[color:var(--color-text-muted)]">
                      Allow other students to see you in helper suggestions.
                    </p>
                  </div>
                  <Switch
                    checked={helpAvailable}
                    onCheckedChange={setHelpAvailable}
                    disabled={submitting}
                  />
                </div>

                {helpAvailable && (
                  <div className="space-y-1.5 pt-2 border-t border-[color:var(--color-border)]/60">
                    <label htmlFor="helpStatus" className="text-xs font-medium text-[color:var(--color-text)]">
                      Custom Availability Status (Optional)
                    </label>
                    <Input
                      id="helpStatus"
                      placeholder="e.g. Free after 4 PM / Busy with exams"
                      value={helpStatus}
                      onChange={(e) => setHelpStatus(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                )}
              </div>

              {/* Contact & Chat Visibility Privacy Radio Options */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[color:var(--color-text)] flex items-center gap-2">
                    <Shield className="size-4 text-[color:var(--color-primary)]" />
                    Contact Info Visibility
                  </label>
                  <Select
                    value={contactVisibility}
                    onChange={(e) =>
                      setContactVisibility(e.target.value as "NOBODY" | "CONNECTIONS" | "COLLEGE")
                    }
                    disabled={submitting}
                  >
                    <option value="CONNECTIONS">Connections Only (Recommended)</option>
                    <option value="COLLEGE">Entire College Network</option>
                    <option value="NOBODY">Nobody (Private)</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[color:var(--color-text)] flex items-center gap-2">
                    <Shield className="size-4 text-[color:var(--color-primary)]" />
                    Chat Request Visibility
                  </label>
                  <Select
                    value={chatRequestVisibility}
                    onChange={(e) =>
                      setChatRequestVisibility(
                        e.target.value as "NOBODY" | "CONNECTIONS" | "COLLEGE",
                      )
                    }
                    disabled={submitting}
                  >
                    <option value="CONNECTIONS">Connections Only</option>
                    <option value="COLLEGE">Entire College Network</option>
                    <option value="NOBODY">Nobody</option>
                  </Select>
                </div>
              </div>

              {/* Step 3 Action Buttons */}
              <div className="pt-4 flex justify-end border-t border-[color:var(--color-border)]/60">
                <Button type="submit" size="lg" disabled={submitting}>
                  {submitting ? (
                    <span>Entering Home...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Finish Setup & Enter Home
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
