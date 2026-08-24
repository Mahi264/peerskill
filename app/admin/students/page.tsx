"use client";

import * as React from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  GraduationCap,
  HelpCircle,
  MessageSquare,
  Search,
  Tag,
  Users,
} from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface StudentItem {
  id: string;
  fullName: string;
  email: string;
  branch: string | null;
  section: string | null;
  graduationYear: number | null;
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  doubtsCount: number;
  answersCount: number;
  skillsCount: number;
  createdAt: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = React.useState<StudentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalStudents, setTotalStudents] = React.useState(0);

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  React.useEffect(() => {
    let ignore = false;

    async function fetchStudents() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (debouncedQuery) params.set("q", debouncedQuery);
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        params.set("page", String(page));
        params.set("limit", "20");

        const res = await fetch(`/api/admin/students?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load students.");

        const json = await res.json();
        if (!ignore && json?.data) {
          setStudents(json.data.students);
          setTotalPages(json.data.pagination.totalPages);
          setTotalStudents(json.data.pagination.total);
        }
      } catch (err) {
        console.error("Fetch students error:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchStudents();

    return () => {
      ignore = true;
    };
  }, [debouncedQuery, statusFilter, page]);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
              Student Directory
            </h1>
            <p className="text-sm sm:text-base text-[color:var(--color-text-muted)] mt-1">
              Verified MITS student roster and academic records.
            </p>
          </div>
          <div className="text-sm text-[color:var(--color-text-muted)] font-medium">
            Total: <span className="text-[color:var(--color-text)] font-bold">{totalStudents}</span> students
          </div>
        </div>

        {/* Filter Toolbar */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--color-text-muted)]" />
              <Input
                type="text"
                placeholder="Search by student name, email, or branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[color:var(--color-bg)]"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(["ALL", "ACTIVE", "PENDING"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    statusFilter === st
                      ? "bg-[color:var(--color-primary)] text-white"
                      : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
                  }`}
                >
                  {st === "ALL" ? "All Statuses" : st}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Students Table / List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-[color:var(--color-surface)] border border-[color:var(--color-border)] animate-pulse"
              />
            ))}
          </div>
        ) : students.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="size-12 text-[color:var(--color-text-muted)] mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-[color:var(--color-text)]">
              No students found
            </h3>
            <p className="text-sm text-[color:var(--color-text-muted)] mt-1 max-w-sm mx-auto">
              {debouncedQuery || statusFilter !== "ALL"
                ? "No student matches the current search or status filter."
                : "No student records have been created yet."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {students.map((student) => {
              const academicSubtitle = [
                student.branch,
                student.section ? `Sec ${student.section}` : null,
                student.graduationYear ? `Class of ${student.graduationYear}` : null,
              ]
                .filter(Boolean)
                .join(" • ");

              return (
                <Card
                  key={student.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[color:var(--color-primary)] transition-colors"
                >
                  {/* Left: Avatar & Identity */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar name={student.fullName} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base text-[color:var(--color-text)] truncate">
                          {student.fullName}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            student.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          {student.status === "ACTIVE" ? (
                            <CheckCircle className="size-3" />
                          ) : (
                            <Clock className="size-3" />
                          )}
                          {student.status}
                        </span>
                      </div>

                      <p className="text-xs text-[color:var(--color-text-muted)] truncate font-mono mt-0.5">
                        {student.email}
                      </p>

                      {academicSubtitle && (
                        <p className="text-xs text-[color:var(--color-text-muted)] mt-1 flex items-center gap-1.5">
                          <GraduationCap className="size-3.5 shrink-0" />
                          <span className="truncate">{academicSubtitle}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Operational Counts & Date */}
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-[color:var(--color-border)] text-xs text-[color:var(--color-text-muted)]">
                    <div className="text-center">
                      <span className="block font-bold text-sm text-[color:var(--color-text)]">
                        {student.doubtsCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <HelpCircle className="size-3" /> Doubts
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="block font-bold text-sm text-[color:var(--color-text)]">
                        {student.answersCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3" /> Answers
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="block font-bold text-sm text-[color:var(--color-text)]">
                        {student.skillsCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="size-3" /> Skills
                      </span>
                    </div>

                    <div className="hidden lg:block text-right pl-2 border-l border-[color:var(--color-border)]">
                      <span className="block font-mono text-[11px]">
                        {new Date(student.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" /> Joined
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[color:var(--color-border)]">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-[color:var(--color-text-muted)] font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
