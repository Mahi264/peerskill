"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Shield, Sparkles, User as UserIcon, X } from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
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

interface ProfileData {
  fullName: string;
  department: string;
  branch?: string | null;
  graduationYear?: number | null;
  section?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  helpAvailable: boolean;
  helpStatus?: string | null;
  contactVisibility: "NOBODY" | "CONNECTIONS" | "COLLEGE";
  chatRequestVisibility: "NOBODY" | "CONNECTIONS" | "COLLEGE";
}

interface UserData {
  id: string;
  email: string;
  status: string;
  role: string;
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"academic" | "skills" | "privacy">("academic");
  const [user, setUser] = React.useState<UserData | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Profile Form state
  const [fullName, setFullName] = React.useState("");
  const [department, setDepartment] = React.useState(DEPARTMENTS[0]);
  const [branch, setBranch] = React.useState("");
  const [graduationYear, setGraduationYear] = React.useState<number | "">(2027);
  const [section, setSection] = React.useState("");
  const [bio, setBio] = React.useState("");

  // Skills state
  const [skills, setSkills] = React.useState<SelectedSkill[]>([]);
  const [customSkillInput, setCustomSkillInput] = React.useState("");

  // Availability & Privacy state
  const [helpAvailable, setHelpAvailable] = React.useState(true);
  const [helpStatus, setHelpStatus] = React.useState("");
  const [contactVisibility, setContactVisibility] = React.useState<"NOBODY" | "CONNECTIONS" | "COLLEGE">("CONNECTIONS");
  const [chatRequestVisibility, setChatRequestVisibility] = React.useState<"NOBODY" | "CONNECTIONS" | "COLLEGE">("CONNECTIONS");

  // Fetch initial profile
  React.useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/");
          return;
        }

        const json = await res.json();
        const u = json?.data?.user;

        if (u?.status === "PENDING") {
          router.replace("/onboarding");
          return;
        }

        setUser(u);

        const p: ProfileData | undefined = u?.profile;
        if (p) {
          if (p.fullName) setFullName(p.fullName);
          if (p.department) setDepartment(p.department);
          if (p.branch) setBranch(p.branch || "");
          if (p.graduationYear) setGraduationYear(p.graduationYear);
          if (p.section) setSection(p.section || "");
          if (p.bio) setBio(p.bio || "");
          if (p.helpAvailable !== undefined) setHelpAvailable(p.helpAvailable);
          if (p.helpStatus) setHelpStatus(p.helpStatus);
          if (p.contactVisibility) setContactVisibility(p.contactVisibility);
          if (p.chatRequestVisibility) setChatRequestVisibility(p.chatRequestVisibility);
        }

        if (u?.userSkills && Array.isArray(u.userSkills)) {
          setSkills(
            u.userSkills.map((us: { skill?: { name: string }; name?: string; level: LevelType }) => ({
              name: us.skill?.name || us.name || "Skill",
              level: us.level,
            })),
          );
        }
      } catch {
        setErrorMsg("Failed to load profile settings.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
    }
  };

  // Skill management helpers
  const handleAddSkill = (skillName: string, level: LevelType = "BEGINNER") => {
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
          department,
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

    if (skills.length < 3) {
      setErrorMsg("At least 3 skills are required.");
      return;
    }

    setSaving(true);

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

      setSuccessMsg("Availability and privacy settings updated successfully.");
    } catch {
      setErrorMsg("Network error while updating privacy settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)] text-sm font-medium animate-pulse">
          <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
          <span>Loading profile settings...</span>
        </div>
      </main>
    );
  }

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
          <Button variant="outline" onClick={handleLogout} className="w-full">
            Log Out
          </Button>
        </Card>
      </main>
    );
  }

  const profileHeaderName = fullName || "Student Profile";

  return (
    <AppShell user={user} profile={{ fullName, department }} onLogout={handleLogout}>
      <div className="space-y-8">
        {/* Profile Header Panel */}
        <Card className="p-6 sm:p-8 bg-gradient-to-r from-white via-white to-[color:var(--color-surface-muted)]/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar name={profileHeaderName} department={department} size="xl" />

            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[color:var(--color-text)]">
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
                {department} {branch ? `• ${branch}` : ""}{" "}
                {graduationYear ? `• Class of ${graduationYear}` : ""}
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
              Skills & Proficiencies ({skills.length})
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
                    <label htmlFor="fullName" className="text-sm font-medium text-[color:var(--color-text)]">
                      Full Name
                    </label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="department" className="text-sm font-medium text-[color:var(--color-text)]">
                      Department
                    </label>
                    <Select
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={saving}
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
                      Branch
                    </label>
                    <Input
                      id="branch"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="graduationYear" className="text-sm font-medium text-[color:var(--color-text)]">
                      Graduation Year
                    </label>
                    <Input
                      id="graduationYear"
                      type="number"
                      value={graduationYear}
                      onChange={(e) =>
                        setGraduationYear(e.target.value ? Number(e.target.value) : "")
                      }
                      disabled={saving}
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
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="bio" className="text-sm font-medium text-[color:var(--color-text)]">
                      Short Bio
                    </label>
                    <span className="text-xs text-[color:var(--color-text-muted)]">
                      {bio.length}/500
                    </span>
                  </div>
                  <Textarea
                    id="bio"
                    maxLength={500}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    disabled={saving}
                    rows={4}
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" size="lg" disabled={saving}>
                    {saving ? "Saving..." : "Save Academic Info"}
                  </Button>
                </div>
              </form>
            )}

            {/* TAB 2: Skills & Proficiencies */}
            {activeTab === "skills" && (
              <form onSubmit={handleSaveSkills} className="space-y-6">
                <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-xl">Skills Index & Levels</CardTitle>
                  <Badge variant={skills.length >= 3 ? "success" : "warning"}>
                    {skills.length} of 3 skills minimum
                  </Badge>
                </CardHeader>

                {/* Seed Skills */}
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
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom skill..."
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

                {/* Skills List */}
                <div className="space-y-2">
                  {skills.map((skill) => (
                    <div
                      key={skill.name}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--color-border)] bg-white p-3.5 shadow-sm"
                    >
                      <Badge variant="skill">{skill.name}</Badge>

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

                <div className="pt-2 flex justify-end">
                  <Button type="submit" size="lg" disabled={saving || skills.length < 3}>
                    {saving ? "Saving..." : "Save Skills Index"}
                  </Button>
                </div>
              </form>
            )}

            {/* TAB 3: Availability & Privacy */}
            {activeTab === "privacy" && (
              <form onSubmit={handleSavePrivacy} className="space-y-6">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-xl">Help Status & Visibility Controls</CardTitle>
                </CardHeader>

                <div className="space-y-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--color-text)]">
                        Available to Help Peers
                      </p>
                      <p className="text-xs text-[color:var(--color-text-muted)]">
                        Show your profile in peer mentor recommendations across campus.
                      </p>
                    </div>
                    <Switch
                      checked={helpAvailable}
                      onCheckedChange={setHelpAvailable}
                      disabled={saving}
                    />
                  </div>

                  {helpAvailable && (
                    <div className="space-y-1.5 pt-2 border-t border-[color:var(--color-border)]/60">
                      <label htmlFor="helpStatus" className="text-xs font-medium text-[color:var(--color-text)]">
                        Custom Availability Message
                      </label>
                      <Input
                        id="helpStatus"
                        placeholder="e.g. Free after 5 PM / Exam prep mode"
                        value={helpStatus}
                        onChange={(e) => setHelpStatus(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[color:var(--color-text)]">
                      Contact Information Visibility
                    </label>
                    <Select
                      value={contactVisibility}
                      onChange={(e) =>
                        setContactVisibility(
                          e.target.value as "NOBODY" | "CONNECTIONS" | "COLLEGE",
                        )
                      }
                      disabled={saving}
                    >
                      <option value="CONNECTIONS">Connections Only</option>
                      <option value="COLLEGE">Entire College Network</option>
                      <option value="NOBODY">Nobody</option>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[color:var(--color-text)]">
                      Chat Request Visibility
                    </label>
                    <Select
                      value={chatRequestVisibility}
                      onChange={(e) =>
                        setChatRequestVisibility(
                          e.target.value as "NOBODY" | "CONNECTIONS" | "COLLEGE",
                        )
                      }
                      disabled={saving}
                    >
                      <option value="CONNECTIONS">Connections Only</option>
                      <option value="COLLEGE">Entire College Network</option>
                      <option value="NOBODY">Nobody</option>
                    </Select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" size="lg" disabled={saving}>
                    {saving ? "Saving..." : "Save Preferences"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
