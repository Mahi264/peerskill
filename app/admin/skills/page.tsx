"use client";

import * as React from "react";
import {
  Edit2,
  HelpCircle,
  Plus,
  Search,
  Tag,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminSkillsSkeleton } from "@/components/skeletons/admin-skeletons";

interface SkillItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  userCount: number;
  doubtCount: number;
  createdAt: string;
}

export default function AdminSkillsPage() {
  const [skills, setSkills] = React.useState<SkillItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Create Skill Form State
  const [isCreating, setIsCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("Computer Science");
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = React.useState(false);

  // Edit Skill Modal State
  const [editingSkill, setEditingSkill] = React.useState<SkillItem | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editCategory, setEditCategory] = React.useState("");
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = React.useState(false);

  async function reloadSkills() {
    try {
      const res = await fetch("/api/admin/skills");
      if (!res.ok) throw new Error("Failed to load skills.");
      const json = await res.json();
      if (json?.data?.skills) {
        setSkills(json.data.skills);
      }
    } catch (err) {
      console.error("Fetch skills error:", err);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/skills");
        if (!res.ok) throw new Error("Failed to load skills.");
        const json = await res.json();
        if (!ignore && json?.data?.skills) {
          setSkills(json.data.skills);
        }
      } catch (err) {
        console.error("Fetch skills error:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleCreateSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || createSubmitting) return;

    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          category: newCategory.trim() || "General",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to create skill.");
      }

      setNewName("");
      setIsCreating(false);
      await reloadSkills();
    } catch (err: unknown) {
      setCreateError((err as Error).message || "Failed to create skill.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleUpdateSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSkill || !editName.trim() || editSubmitting) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/admin/skills/${editingSkill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory.trim() || "General",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to update skill.");
      }

      setEditingSkill(null);
      await reloadSkills();
    } catch (err: unknown) {
      setEditError((err as Error).message || "Failed to update skill.");
    } finally {
      setEditSubmitting(false);
    }
  }

  const filteredSkills = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
              Skills Taxonomy
            </h1>
            <p className="text-sm sm:text-base text-[color:var(--color-text-muted)] mt-1">
              Manage platform-predefined skills, domains, and taxonomy categories.
            </p>
          </div>
          <Button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="size-4" />
            Add Predefined Skill
          </Button>
        </div>

        {/* Create Skill Form Drawer/Card */}
        {isCreating && (
          <Card className="p-5 border-[color:var(--color-primary)] bg-[color:var(--color-surface)]">
            <h3 className="font-semibold text-base text-[color:var(--color-text)] mb-3">
              Add New Predefined Skill
            </h3>
            {createError && (
              <div className="p-3 mb-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreateSkill} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[color:var(--color-text)] mb-1">
                    Skill Name
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Operating Systems"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--color-text)] mb-1">
                    Category / Domain
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Computer Science & IT"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setCreateError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={createSubmitting || !newName.trim()}>
                  {createSubmitting ? "Creating..." : "Save Skill"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Search Toolbar */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[color:var(--color-text-muted)]" />
            <Input
              type="text"
              placeholder="Filter skills by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[color:var(--color-bg)]"
            />
          </div>
        </Card>

        {/* Skills Grid */}
        {loading ? (
          <AdminSkillsSkeleton count={6} />
        ) : filteredSkills.length === 0 ? (
          <Card className="p-12 text-center">
            <Tag className="size-12 text-[color:var(--color-text-muted)] mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-[color:var(--color-text)]">
              No skills found
            </h3>
            <p className="text-sm text-[color:var(--color-text-muted)] mt-1">
              {searchQuery ? "No skill matches the filter." : "No predefined skills created yet."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => (
              <Card
                key={skill.id}
                className="p-4 flex flex-col justify-between hover:border-[color:var(--color-primary)] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base text-[color:var(--color-text)]">
                      {skill.name}
                    </h3>
                    <button
                      onClick={() => {
                        setEditingSkill(skill);
                        setEditName(skill.name);
                        setEditCategory(skill.category);
                        setEditError(null);
                      }}
                      className="p-1.5 rounded-md text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text)] transition-colors"
                      title="Edit skill"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                  </div>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]">
                    {skill.category}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[color:var(--color-border)] flex items-center justify-between text-xs text-[color:var(--color-text-muted)]">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" />
                    <span className="font-semibold text-[color:var(--color-text)]">
                      {skill.userCount}
                    </span>{" "}
                    students
                  </span>
                  <span className="flex items-center gap-1">
                    <HelpCircle className="size-3.5" />
                    <span className="font-semibold text-[color:var(--color-text)]">
                      {skill.doubtCount}
                    </span>{" "}
                    doubts
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Skill Modal */}
        {editingSkill && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-[color:var(--color-text)]">
                Edit Predefined Skill
              </h3>

              {editError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                  {editError}
                </div>
              )}

              <form onSubmit={handleUpdateSkill} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[color:var(--color-text)] mb-1">
                    Skill Name
                  </label>
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[color:var(--color-text)] mb-1">
                    Category / Domain
                  </label>
                  <Input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSkill(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={editSubmitting || !editName.trim()}>
                    {editSubmitting ? "Updating..." : "Update Skill"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
  );
}
