"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, MessageSquare, Trash2 } from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertBanner } from "@/components/ui/toast";

interface Author {
  id: string;
  email: string;
  fullName: string;
  department: string;
  avatarUrl?: string | null;
}

interface Skill {
  id: string;
  name: string;
  slug: string;
}

interface Answer {
  id: string;
  doubtId: string;
  authorId: string;
  body: string;
  isAccepted: boolean;
  createdAt: string;
  updatedAt: string;
  author: Author;
}

interface DoubtDetail {
  id: string;
  authorId: string;
  title: string;
  body: string;
  urgency: "CURIOUS" | "ASSIGNMENT_STUCK" | "PROJECT_BLOCKED" | "EXAM_PREP";
  status: "OPEN" | "RESOLVED" | "CLOSED";
  answerCount: number;
  acceptedAnswerId?: string | null;
  createdAt: string;
  updatedAt: string;
  author: Author;
  skills: Skill[];
  answers: Answer[];
}

interface UserSession {
  id: string;
  email: string;
  status: string;
  role: string;
}

interface UserProfile {
  fullName: string;
  department: string;
  avatarUrl?: string | null;
}

export default function DoubtDetailPage() {
  const params = useParams();
  const router = useRouter();
  const doubtId = params?.id as string;

  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<UserSession | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  const [doubt, setDoubt] = React.useState<DoubtDetail | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [answerBody, setAnswerBody] = React.useState("");
  const [submittingAnswer, setSubmittingAnswer] = React.useState(false);
  const [acceptingAnswerId, setAcceptingAnswerId] = React.useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Load user session & doubt details
  React.useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meJson = await meRes.json();
          const u = meJson?.data?.user;
          setUser(u);
          setProfile(u?.profile || null);
        }

        const doubtRes = await fetch(`/api/doubts/${doubtId}`);
        const doubtJson = await doubtRes.json();

        if (!doubtRes.ok) {
          setErrorMsg(doubtJson?.error?.message || "Doubt not found.");
          setLoading(false);
          return;
        }

        setDoubt(doubtJson?.data?.doubt || null);
      } catch {
        setErrorMsg("Failed to load doubt details.");
      } finally {
        setLoading(false);
      }
    }

    if (doubtId) {
      loadData();
    }
  }, [doubtId]);

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (answerBody.trim().length < 5) {
      setErrorMsg("Answer body must be at least 5 characters long.");
      return;
    }

    setSubmittingAnswer(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/doubts/${doubtId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: answerBody.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json?.error?.message || "Failed to submit answer.");
        return;
      }

      setAnswerBody("");
      setSuccessMsg("Answer submitted successfully!");

      const refRes = await fetch(`/api/doubts/${doubtId}`);
      if (refRes.ok) {
        const refJson = await refRes.json();
        setDoubt(refJson?.data?.doubt || null);
      }
    } catch {
      setErrorMsg("Failed to submit answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    setAcceptingAnswerId(answerId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/doubts/${doubtId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json?.error?.message || "Failed to accept answer.");
        return;
      }

      setSuccessMsg("Answer accepted! Doubt is now resolved.");

      const refRes = await fetch(`/api/doubts/${doubtId}`);
      if (refRes.ok) {
        const refJson = await refRes.json();
        setDoubt(refJson?.data?.doubt || null);
      }
    } catch {
      setErrorMsg("Failed to accept answer.");
    } finally {
      setAcceptingAnswerId(null);
    }
  };

  const handleDeleteDoubt = async () => {
    setDeleting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/doubts/${doubtId}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json?.error?.message || "Failed to delete doubt.");
        setShowDeleteConfirm(false);
        return;
      }

      router.replace("/home");
    } catch {
      setErrorMsg("Failed to delete doubt due to a network error.");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)] text-sm font-medium animate-pulse">
          <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
          <span>Loading campus doubt...</span>
        </div>
      </main>
    );
  }

  if (errorMsg && !doubt) {
    return (
      <AppShell user={user} profile={profile}>
        <div className="max-w-2xl mx-auto space-y-6 text-center py-12">
          <AlertBanner variant="error" message={errorMsg} />
          <Button asChild variant="outline">
            <Link href="/home">
              <ArrowLeft className="size-4 mr-2" />
              Back to Home Feed
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!doubt) return null;

  const isAuthor = user?.id === doubt.authorId;
  const isResolved = doubt.status === "RESOLVED";
  const canDelete = isAuthor && doubt.status === "OPEN" && doubt.answers.length === 0;

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "ASSIGNMENT_STUCK":
        return <Badge variant="warning">Assignment Stuck</Badge>;
      case "PROJECT_BLOCKED":
        return <Badge variant="danger">Project Blocked</Badge>;
      case "EXAM_PREP":
        return <Badge variant="accent">Exam Prep</Badge>;
      case "CURIOUS":
      default:
        return <Badge variant="primary">Just Curious</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AppShell user={user} profile={profile}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation back button & author delete action */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Campus Feed
          </Link>

          {canDelete && (
            <div>
              {!showDeleteConfirm ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger)]/10 text-xs font-semibold"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Delete Doubt
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/5 p-2">
                  <span className="text-xs font-semibold text-[color:var(--color-danger)]">
                    Delete this doubt? This can&apos;t be undone.
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDeleteDoubt}
                    disabled={deleting}
                    className="h-7 text-xs px-2.5"
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="h-7 text-xs px-2.5"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {errorMsg && <AlertBanner variant="error" message={errorMsg} />}
        {successMsg && <AlertBanner variant="success" message={successMsg} />}

        {/* Main Doubt Header & Description Card */}
        <Card className="p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-border)]/60 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              {isResolved ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  RESOLVED
                </Badge>
              ) : (
                <Badge variant="outline">OPEN</Badge>
              )}
              {getUrgencyBadge(doubt.urgency)}
            </div>

            <span className="text-xs text-[color:var(--color-text-muted)]">
              Posted {formatDate(doubt.createdAt)}
            </span>
          </div>

          {/* Doubt Title & Skills */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[color:var(--color-text)] tracking-tight">
              {doubt.title}
            </h1>

            <div className="flex flex-wrap gap-2">
              {doubt.skills.map((s) => (
                <Badge key={s.id} variant="skill">
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Author info snippet */}
          <div className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border)]/60 bg-[color:var(--color-surface-muted)]/40 p-3.5">
            <Avatar
              name={doubt.author.fullName}
              department={doubt.author.department}
              src={doubt.author.avatarUrl}
              size="md"
            />
            <div>
              <p className="text-sm font-semibold text-[color:var(--color-text)]">
                {doubt.author.fullName}
              </p>
              <p className="text-xs text-[color:var(--color-text-muted)]">
                {doubt.author.department || "Campus Student"}
              </p>
            </div>
          </div>

          {/* Body Text */}
          <div className="pt-2 border-t border-[color:var(--color-border)]/60">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-text-muted)] mb-2">
              Problem Description
            </h2>
            <p className="text-sm sm:text-base text-[color:var(--color-text)] whitespace-pre-wrap leading-relaxed">
              {doubt.body}
            </p>
          </div>
        </Card>

        {/* Answers List Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-5 text-[color:var(--color-primary)]" />
              <h2 className="text-xl font-bold text-[color:var(--color-text)]">
                Answers ({doubt.answers.length})
              </h2>
            </div>
          </div>

          {doubt.answers.length === 0 ? (
            <Card className="p-8 text-center space-y-2 bg-[color:var(--color-surface-muted)]/30 border-dashed">
              <HelpCircle className="size-8 mx-auto text-[color:var(--color-text-muted)]" />
              <p className="text-sm font-medium text-[color:var(--color-text)]">
                No answers submitted yet.
              </p>
              <p className="text-xs text-[color:var(--color-text-muted)]">
                Be the first classmate to answer this doubt!
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {doubt.answers.map((ans) => (
                <Card
                  key={ans.id}
                  className={`p-6 space-y-4 transition-all ${
                    ans.isAccepted
                      ? "border-[color:var(--color-success)]/40 bg-gradient-to-r from-emerald-50/30 via-white to-white ring-1 ring-[color:var(--color-success)]/20"
                      : "border-[color:var(--color-border)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={ans.author.fullName}
                        department={ans.author.department}
                        src={ans.author.avatarUrl}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[color:var(--color-text)]">
                            {ans.author.fullName}
                          </p>
                          {ans.isAccepted && (
                            <Badge variant="success" className="text-[10px] py-0.5 px-2">
                              ACCEPTED ANSWER
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[color:var(--color-text-muted)]">
                          {ans.author.department || "Campus Student"} • {formatDate(ans.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Author Accept Action */}
                    {isAuthor && !ans.isAccepted && doubt.status !== "CLOSED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAcceptAnswer(ans.id)}
                        disabled={acceptingAnswerId === ans.id}
                      >
                        {acceptingAnswerId === ans.id ? "Accepting..." : "Accept Answer"}
                      </Button>
                    )}
                  </div>

                  <p className="text-sm text-[color:var(--color-text)] whitespace-pre-wrap leading-relaxed pl-1">
                    {ans.body}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Answer Form Card */}
        {user?.status === "ACTIVE" && doubt.status !== "CLOSED" && (
          <Card className="p-6 space-y-4 border-[color:var(--color-primary)]/20 shadow-sm">
            <CardHeader className="p-0">
              <CardTitle className="text-lg font-bold text-[color:var(--color-text)]">
                Submit Your Answer
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <form onSubmit={handleSubmitAnswer} className="space-y-4">
                <Textarea
                  rows={4}
                  placeholder="Type your explanation or solution for this doubt..."
                  value={answerBody}
                  onChange={(e) => setAnswerBody(e.target.value)}
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[color:var(--color-text-muted)]">
                    Minimum 5 characters required.
                  </span>

                  <Button
                    type="submit"
                    disabled={submittingAnswer || answerBody.trim().length < 5}
                  >
                    <span className="flex items-center gap-2">
                      {submittingAnswer ? "Submitting..." : "Submit Answer"}
                      <ArrowRight className="size-4" />
                    </span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {isResolved && (
          <div className="rounded-xl border border-[color:var(--color-success)]/30 bg-emerald-50/40 p-4 text-center text-xs text-[color:var(--color-text-muted)]">
            <p className="font-semibold text-[color:var(--color-success)]">
              ✓ An answer has been accepted for this doubt. Additional answers are still welcome!
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
