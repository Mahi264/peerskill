"use client";

import * as React from "react";
import {
  Shield,
  Sparkles,
  User as UserIcon,
  X,
} from "lucide-react";

import { useStudentAuth } from "@/components/auth/student-auth-context";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertBanner } from "@/components/ui/toast";
import { formatPublicPeerAcademicSubtitle } from "@/lib/utils";

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

export default function ProfilePage() {
  const { user, profile: authProfile, skills: authSkills, logout, refreshAuth } = useStudentAuth();

  const [activeTab, setActiveTab] = React.useState<"academic" | "skills" | "privacy">("academic");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Profile Form state initialized from auth context (name and branch are read-only)
  const fullName = authProfile?.fullName || "";
  const branch = authProfile?.branch || "";
  const [graduationYear, setGraduationYear] = React.useState<number | "">(authProfile?.graduationYear || "");
  const [section, setSection] = React.useState(authProfile?.section || "");
  const [bio, setBio] = React.useState(authProfile?.bio || "");

  // Skills state
  const [skills, setSkills] = React.useState<SelectedSkill[]>(
    authSkills?.map((s) => ({ name: s.name, level: s.level as LevelType })) || [],
  );
  const [customSkillInput, setCustomSkillInput] = React.useState("");

  // Availability & Privacy state
  const [helpAvailable, setHelpAvailable] = React.useState(authProfile?.helpAvailable ?? true);
  const [helpStatus, setHelpStatus] = React.useState(authProfile?.helpStatus || "");
  const [contactVisibility, setContactVisibility] = React.useState<"NOBODY" | "CONNECTIONS" | "COLLEGE">(
    (authProfile?.contactVisibility as "NOBODY" | "CONNECTIONS" | "COLLEGE") || "CONNECTIONS",
  );
  const [chatRequestVisibility, setChatRequestVisibility] = React.useState<"NOBODY" | "CONNECTIONS" | "COLLEGE">(
    (authProfile?.chatRequestVisibility as "NOBODY" | "CONNECTIONS" | "COLLEGE") || "CONNECTIONS",
  );

  // Skill Management
  const handleAddSkill = (skillName: string, level: LevelType = "INTERMEDIATE") => {
    const clean = skillName.trim();
    if (!clean) return;

    if (skills.some((s) => s.name.toLowerCase() === clean.toLowerCase())) {
      return;
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

  // Save Handlers
  const handleSaveAcademic = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          branch: branch.trim() || undefined,
          graduationYear: graduationYear ? Number(graduationYear) : undefined,
          section: section.trim() || undefined,
          bio: bio.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json?.error?.message || "Failed to update academic profile.");
        return;
      }

      await refreshAuth();
      setSuccessMsg("Academic profile updated successfully.");
    } catch {
      setErrorMsg("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSkills = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    let currentSkills = [...skills];
    const pendingCustom = customSkillInput.trim();
    if (
      pendingCustom &&
      !currentSkills.some((s) => s.name.toLowerCase() === pendingCustom.toLowerCase())
    ) {
      const newSkill: { name: string; level: LevelType } = {
        name: pendingCustom,
        level: "BEGINNER",
      };
      currentSkills = [...currentSkills, newSkill];
      setSkills(currentSkills);
      setCustomSkillInput("");
    }

    if (currentSkills.length < 3) {
      setErrorMsg("At least 3 skills are required.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/profiles/me/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: currentSkills.map((s) => ({ name: s.name, level: s.level })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json?.error?.message || "Failed to update skills.");
        return;
      }

      if (json?.data?.skills && Array.isArray(json.data.skills)) {
        setSkills(
          json.data.skills.map((us: { name?: string; skill?: { name: string }; level: LevelType }) => ({
            name: us.name || us.skill?.name || "Skill",
            level: us.level,
          })),
        );
      }

      await refreshAuth();
      setSuccessMsg("Skills and proficiencies saved successfully.");
    } catch {
      setErrorMsg("Network error while saving skills.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    setSaving(true);

    try {
      await fetch("/api/profiles/me/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          helpAvailable,
          helpStatus: helpStatus.trim() || null,
        }),
      });

      await fetch("/api/profiles/me/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactVisibility,
          chatRequestVisibility,
        }),
      });

      await refreshAuth();
      setSuccessMsg("Privacy and availability settings saved successfully.");
    } catch {
      setErrorMsg("Network error while saving privacy settings.");
    } finally {
      setSaving(false);
    }
  };

  if (user?.status === "SUSPENDED") {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6 text-[color:var(--color-text)]">
        <Card className="max-w-md w-full border-[color:var(--color-danger)]/30 p-8 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]">
            <Shield className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-[color:var(--color-danger)]">Account Suspended</h1>
          <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed">
            Your account has been suspended by campus moderation. You cannot access PeerSkill until your account is reinstated.
          </p>
          <Button variant="outline" onClick={logout} className="w-full">
            Log Out
          </Button>
        </Card>
      </main>
    );
  }

  const profileHeaderName = fullName || "Student Profile";
  const academicSubtitle = formatPublicPeerAcademicSubtitle({
    branch,
    section,
    graduationYear: graduationYear ? Number(graduationYear) : null,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header Panel */}
      <Card className="p-6 sm:p-8 bg-gradient-to-r from-white via-white to-[color:var(--color-surface-muted)]/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar name={profileHeaderName} size="xl" />

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">
                {profileHeaderName}
              </h1>
              <Badge
                variant={helpAvailable ? "success" : "outline"}
                className="text-xs px-2.5 py-0.5"
              >
                {helpAvailable ? "Available to help" : "Unavailable"}
              </Badge>
            </div>

            <p className="text-sm font-medium text-[color:var(--color-text-muted)]">
              {academicSubtitle}
            </p>

            {bio && (
              <p className="text-sm text-[color:var(--color-text)] leading-relaxed italic pt-1 max-w-2xl">
                &quot;{bio}&quot;
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Feedback Messages */}
      {errorMsg && <AlertBanner variant="error" message={errorMsg} />}
      {successMsg && <AlertBanner variant="success" message={successMsg} />}

      {/* Tab-Segmented Form Container */}
      <Card className="p-0 overflow-hidden">
        {/* Tab Navigation Header */}
        <div className="flex border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/40 px-6 pt-4 gap-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab("academic");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "academic"
                ? "border-[color:var(--color-primary)] text-[color:var(--color-primary)] bg-white rounded-t-lg"
                : "border-transparent text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
            }`}
          >
            <UserIcon className="size-4" />
            Academic Info
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("skills");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "skills"
                ? "border-[color:var(--color-primary)] text-[color:var(--color-primary)] bg-white rounded-t-lg"
                : "border-transparent text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
            }`}
          >
            <Sparkles className="size-4" />
            <span>Skills & Proficiencies</span>
            <Badge
              variant={activeTab === "skills" ? "outline" : "default"}
              className={`text-[10px] px-1.5 py-0 ${
                activeTab === "skills"
                  ? "border-[color:var(--color-primary)]/40 text-[color:var(--color-primary)]"
                  : ""
              }`}
            >
              {skills.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("privacy");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "privacy"
                ? "border-[color:var(--color-primary)] text-[color:var(--color-primary)] bg-white rounded-t-lg"
                : "border-transparent text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
            }`}
          >
            <Shield className="size-4" />
            Availability & Privacy
          </button>
        </div>

        <CardContent className="p-6 sm:p-8">
          {/* TAB 1: Academic & Bio */}
          {activeTab === "academic" && (
            <form onSubmit={handleSaveAcademic} className="space-y-6">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-xl">Academic & Cohort Details</CardTitle>
              </CardHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="fullName" className="text-sm font-medium text-[color:var(--color-text)]">
                      Full Name
                    </label>
                    <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Verified via Google Workspace
                    </span>
                  </div>
                  <Input
                    id="fullName"
                    value={fullName}
                    disabled
                    className="bg-[color:var(--color-surface-muted)] cursor-not-allowed opacity-90 font-medium"
                  />
                  <p className="text-[11px] text-[color:var(--color-text-muted)]">
                    Your full name is linked to your institutional MITS Google account and cannot be modified here.
                  </p>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="branch" className="text-sm font-medium text-[color:var(--color-text)]">
                    Branch / Program
                  </label>
                  <Input
                    id="branch"
                    value={branch || "Unresolved Program"}
                    disabled
                    readOnly
                    className="bg-[color:var(--color-surface-muted)] cursor-not-allowed opacity-90 font-medium"
                  />
                  <p className="text-[11px] text-[color:var(--color-text-muted)]">
                    Automatically derived from your verified MITS institutional email.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="graduationYear" className="text-sm font-medium text-[color:var(--color-text)]">
                    Expected Graduation Year
                  </label>
                  <Input
                    id="graduationYear"
                    type="number"
                    value={graduationYear}
                    onChange={(e) =>
                      setGraduationYear(e.target.value ? Number(e.target.value) : "")
                    }
                    disabled={saving}
                    placeholder="e.g. 2028"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="section" className="text-sm font-medium text-[color:var(--color-text)]">
                    Section
                  </label>
                  <Input
                    id="section"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    disabled={saving}
                    placeholder="e.g. A, B, or AIML-1"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="bio" className="text-sm font-medium text-[color:var(--color-text)]">
                    Short Bio / Academic Interests
                  </label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    disabled={saving}
                    rows={3}
                    placeholder="Briefly describe what you're studying, working on, or interested in collaborating on..."
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" size="lg" disabled={saving}>
                  {saving ? "Saving..." : "Save Academic Details"}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: Skills & Proficiencies */}
          {activeTab === "skills" && (
            <form onSubmit={handleSaveSkills} className="space-y-6">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-xl">Skills & Proficiencies</CardTitle>
              </CardHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[color:var(--color-text)]">
                    Quick Add Skills
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SEED_SKILLS.map((seed) => {
                      const isAdded = skills.some(
                        (s) => s.name.toLowerCase() === seed.toLowerCase(),
                      );
                      return (
                        <button
                          key={seed}
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAddSkill(seed)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer select-none font-medium ${
                            isAdded
                              ? "bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)] border-transparent opacity-60 cursor-not-allowed"
                              : "bg-white border-[color:var(--color-border)] text-[color:var(--color-text)] hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)] hover:shadow-xs active:scale-95"
                          }`}
                        >
                          + {seed}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-sm font-semibold text-[color:var(--color-text)]">
                    Add Custom Skill
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Next.js, Rust, Docker, Computer Vision"
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
                      disabled={!customSkillInput.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Selected Skills List */}
              <div className="space-y-3 pt-4 border-t border-[color:var(--color-border)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[color:var(--color-text)]">
                    Your Skills ({skills.length})
                  </h3>
                  <span className="text-xs text-[color:var(--color-text-muted)]">
                    Minimum 3 skills recommended
                  </span>
                </div>

                {skills.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-[color:var(--color-border)] text-center text-xs text-[color:var(--color-text-muted)] bg-white">
                    No skills added yet. Select from the quick-add options above or type a custom skill.
                  </div>
                ) : (
                  <div className="divide-y divide-[color:var(--color-border)]/50 border border-[color:var(--color-border)] rounded-xl bg-[color:var(--color-surface)] overflow-hidden">
                    {skills.map((skill) => (
                      <div
                        key={skill.name}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 bg-[color:var(--color-surface)] hover:bg-[color:var(--color-surface-muted)]/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm text-[color:var(--color-text)] truncate">
                            {skill.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <select
                            value={skill.level}
                            onChange={(e) =>
                              handleLevelChange(skill.name, e.target.value as LevelType)
                            }
                            className="text-xs font-medium bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-[color:var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary)] cursor-pointer"
                          >
                            <option value="BEGINNER">Beginner</option>
                            <option value="INTERMEDIATE">Intermediate</option>
                            <option value="ADVANCED">Advanced</option>
                            <option value="MENTOR">Mentor</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill.name)}
                            className="text-[color:var(--color-text-muted)] hover:text-[color:var(--color-danger)] transition-tactile active:scale-90 p-1 cursor-pointer"
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

              <div className="pt-2 flex justify-end">
                <Button type="submit" size="lg" disabled={saving || skills.length < 3}>
                  {saving ? "Saving..." : "Save Skills"}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 3: Availability & Privacy */}
          {activeTab === "privacy" && (
            <form onSubmit={handleSavePrivacy} className="space-y-8">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-xl">Peer Help Availability</CardTitle>
              </CardHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/30">
                  <div className="space-y-0.5">
                    <label htmlFor="helpAvailable" className="text-sm font-semibold text-[color:var(--color-text)]">
                      Available to help peers
                    </label>
                    <p className="text-xs text-[color:var(--color-text-muted)]">
                      When enabled, your profile appears as active and open to doubt requests in campus search.
                    </p>
                  </div>
                  <Switch
                    id="helpAvailable"
                    checked={helpAvailable}
                    onCheckedChange={setHelpAvailable}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="helpStatus" className="text-sm font-medium text-[color:var(--color-text)]">
                    Status Message (Optional)
                  </label>
                  <Input
                    id="helpStatus"
                    placeholder="e.g. In CSE Lab after 4 PM, free for React/DSA questions"
                    value={helpStatus}
                    onChange={(e) => setHelpStatus(e.target.value)}
                    disabled={saving || !helpAvailable}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-[color:var(--color-border)]">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-xl">Campus Visibility & Contacts</CardTitle>
                </CardHeader>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="contactVisibility" className="text-sm font-medium text-[color:var(--color-text)]">
                      Who can view your contact information?
                    </label>
                    <select
                      id="contactVisibility"
                      value={contactVisibility}
                      onChange={(e) =>
                        setContactVisibility(
                          e.target.value as "NOBODY" | "CONNECTIONS" | "COLLEGE",
                        )
                      }
                      className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-lg p-2.5 text-[color:var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary)]"
                    >
                      <option value="COLLEGE">All Verified MITS Students</option>
                      <option value="CONNECTIONS">Mutual Peer Connections Only</option>
                      <option value="NOBODY">Private (Only Me)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="chatRequestVisibility" className="text-sm font-medium text-[color:var(--color-text)]">
                      Who can send direct chat/collaboration requests?
                    </label>
                    <select
                      id="chatRequestVisibility"
                      value={chatRequestVisibility}
                      onChange={(e) =>
                        setChatRequestVisibility(
                          e.target.value as "NOBODY" | "CONNECTIONS" | "COLLEGE",
                        )
                      }
                      className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-lg p-2.5 text-[color:var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary)]"
                    >
                      <option value="COLLEGE">All Verified MITS Students</option>
                      <option value="CONNECTIONS">Mutual Peer Connections Only</option>
                      <option value="NOBODY">Nobody</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" size="lg" disabled={saving}>
                  {saving ? "Saving..." : "Save Privacy & Availability"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
