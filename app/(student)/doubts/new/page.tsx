"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Plus, ShieldCheck, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AlertBanner } from "@/components/ui/toast";
import { invalidateAllDoubtFeeds, invalidateSearchKnowledge } from "@/lib/data-cache";

const SEED_SKILLS = [
  "C++",
  "Python",
  "Java",
  "React",
  "Data Structures",
  "Algorithms",
  "DBMS",
  "Node.js",
  "SQL",
  "Operating Systems",
  "Computer Networks",
];

const URGENCIES = [
  { value: "CURIOUS", label: "Just Curious / General Concept" },
  { value: "ASSIGNMENT_STUCK", label: "Assignment Stuck / Code Bug" },
  { value: "PROJECT_BLOCKED", label: "Project Blocked / High Priority" },
  { value: "EXAM_PREP", label: "Exam Prep / Test Preparation" },
];

export default function NewDoubtPage() {
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [urgency, setUrgency] = React.useState("CURIOUS");
  const [skills, setSkills] = React.useState<string[]>([]);
  const [customSkill, setCustomSkill] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (!skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setCustomSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s.toLowerCase() !== skillToRemove.toLowerCase()));
  };

  const isValid = title.trim().length >= 5 && body.trim().length >= 10 && skills.length >= 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          urgency,
          skills,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json?.error?.message || "Failed to post doubt.");
        return;
      }

      // Invalidate all Home doubt-feed cached variations and Knowledge search
      invalidateAllDoubtFeeds();
      invalidateSearchKnowledge();

      const doubtId = json?.data?.doubt?.id;
      if (doubtId) {
        router.push(`/doubts/${doubtId}`);
      } else {
        router.push("/home");
      }
    } catch {
      setErrorMsg("Network error while submitting doubt.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/home"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      {errorMsg && <AlertBanner variant="error" message={errorMsg} />}

      <Card className="p-6 sm:p-8 space-y-6">
        <CardHeader className="p-0 border-b border-[color:var(--color-border)]/60 pb-5">
          <div>
            <CardTitle className="text-2xl font-bold text-[color:var(--color-text)]">
              Raise a Campus Doubt
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-[color:var(--color-text-muted)]">
              Ask a question to find peers in your college who understand your courses and assignments.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="doubt-title" className="text-sm font-semibold text-[color:var(--color-text)]">
                  Doubt Title <span className="text-[color:var(--color-danger)]">*</span>
                </label>
                <span className="text-xs text-[color:var(--color-text-muted)]">
                  {title.length}/200 chars
                </span>
              </div>
              <Input
                id="doubt-title"
                placeholder="e.g. How do I resolve circular references in C++ smart pointers?"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                maxLength={200}
              />
              <p className="text-xs text-[color:var(--color-text-muted)]">
                Summarize your problem clearly in one sentence (min 5 characters).
              </p>
            </div>

            {/* Description Body */}
            <div className="space-y-2">
              <label htmlFor="doubt-body" className="text-sm font-semibold text-[color:var(--color-text)]">
                Detailed Description <span className="text-[color:var(--color-danger)]">*</span>
              </label>
              <RichTextEditor
                id="doubt-body"
                rows={6}
                placeholder="Describe your doubt in detail. Mention what code, concepts, or steps you have tried..."
                value={body}
                onChange={(val) => setBody(val)}
              />
              <p className="text-xs text-[color:var(--color-text-muted)]">
                Minimum 10 characters. Include context, code snippets, or error messages.
              </p>
            </div>

            {/* Urgency Selector */}
            <div className="space-y-2">
              <label htmlFor="doubt-urgency" className="text-sm font-semibold text-[color:var(--color-text)]">
                Urgency Level
              </label>
              <Select
                id="doubt-urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="h-10 text-sm font-medium"
              >
                {URGENCIES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Skill Tag Picker */}
            <div className="space-y-4 pt-2 border-t border-[color:var(--color-border)]/60">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[color:var(--color-text)]">
                  Skill Tags <span className="text-[color:var(--color-danger)]">*</span>
                </label>
                <span className="text-xs text-[color:var(--color-text-muted)]">
                  {skills.length} selected
                </span>
              </div>

              {/* Quick Add Seed Skills */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  Quick Add Campus Skills
                </span>
                <div className="flex flex-wrap gap-2">
                  {SEED_SKILLS.map((seed) => {
                    const isSelected = skills.some((s) => s.toLowerCase() === seed.toLowerCase());
                    return (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => (isSelected ? handleRemoveSkill(seed) : handleAddSkill(seed))}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-[color:var(--color-primary)] text-white shadow-sm"
                            : "border border-[color:var(--color-border)] bg-white text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)]"
                        }`}
                      >
                        {isSelected ? <Check className="size-3 text-white" /> : <Plus className="size-3" />}
                        <span>{seed}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Skill Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type a custom skill tag (e.g. PyTorch)..."
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill(customSkill);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleAddSkill(customSkill)}
                  disabled={!customSkill.trim()}
                >
                  Add Tag
                </Button>
              </div>

              {/* Selected Skills Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {skills.length === 0 ? (
                  <span className="text-xs text-[color:var(--color-text-muted)]">
                    No skill tags added yet. Tap quick-add chips above or enter a custom tag.
                  </span>
                ) : (
                  skills.map((s) => (
                    <Badge key={s} variant="skill" className="inline-flex items-center gap-1 py-1 px-3">
                      <span>{s}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s)}
                        className="hover:text-[color:var(--color-danger)] focus:outline-none"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-4 border-t border-[color:var(--color-border)]/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-[color:var(--color-text-muted)]">
                <ShieldCheck className="size-4 text-[color:var(--color-primary)] shrink-0" />
                <span>Visible to all verified campus members.</span>
              </div>

              <Button type="submit" size="lg" disabled={!isValid || submitting}>
                <span className="flex items-center gap-2">
                  {submitting ? "Posting Doubt..." : "Post Doubt"}
                  <ArrowRight className="size-4" />
                </span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
