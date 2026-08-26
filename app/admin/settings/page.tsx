"use client";

import * as React from "react";
import {
  CheckCircle2,
  Save,
  ShieldCheck,
  Sliders,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AdminSettingsPage() {
  const [platformName, setPlatformName] = React.useState("");
  const [collegeDisplayName, setCollegeDisplayName] = React.useState("");
  const [supportEmail, setSupportEmail] = React.useState("");
  const [allowCustomSkills, setAllowCustomSkills] = React.useState(true);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error("Failed to load platform settings.");
        const json = await res.json();
        if (!ignore && json?.data?.settings) {
          const s = json.data.settings;
          setPlatformName(s.platformName);
          setCollegeDisplayName(s.collegeDisplayName);
          setSupportEmail(s.supportEmail);
          setAllowCustomSkills(s.allowCustomSkills);
        }
      } catch (err: unknown) {
        if (!ignore) setError((err as Error).message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformName: platformName.trim(),
          collegeDisplayName: collegeDisplayName.trim(),
          supportEmail: supportEmail.trim(),
          allowCustomSkills,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to update settings.");
      }

      setSuccessMessage("Platform settings saved successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--color-text)] flex items-center gap-2.5">
            <Sliders className="size-6 text-[color:var(--color-primary)]" />
            Platform Settings
          </h1>
          <p className="text-sm sm:text-base text-[color:var(--color-text-muted)] mt-1">
            Configure campus branding, display parameters, and student feature flags.
          </p>
        </div>

        {/* Security & Non-Sensitive Scope Callout */}
        <div className="p-4 rounded-xl bg-[color:var(--color-surface)] border border-[color:var(--color-border)] flex items-start gap-3">
          <ShieldCheck className="size-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-xs text-[color:var(--color-text-muted)] leading-relaxed">
            <strong className="text-[color:var(--color-text)] font-semibold">
              Security Boundary:
            </strong>{" "}
            Only safe, non-sensitive platform presentation settings can be edited here. Google OAuth secrets,
            database connection strings, and encryption keys are strictly managed via server environment variables.
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-500" />
            {successMessage}
          </div>
        )}

        {loading ? (
          <Card className="p-6 h-64 animate-pulse" />
        ) : (
          <Card className="p-6">
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)] mb-1.5">
                  Platform Name
                </label>
                <Input
                  type="text"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder="e.g. PeerSkill"
                  required
                />
                <p className="text-xs text-[color:var(--color-text-muted)] mt-1">
                  Brand name displayed across navigation headers and browser title tags.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)] mb-1.5">
                  College / Campus Full Name
                </label>
                <Input
                  type="text"
                  value={collegeDisplayName}
                  onChange={(e) => setCollegeDisplayName(e.target.value)}
                  placeholder="e.g. Madhav Institute of Technology & Science (MITS)"
                  required
                />
                <p className="text-xs text-[color:var(--color-text-muted)] mt-1">
                  Full institutional name shown on onboarding and authentication screens.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)] mb-1.5">
                  Support Contact Email
                </label>
                <Input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="e.g. support@mitsgwl.ac.in"
                  required
                />
                <p className="text-xs text-[color:var(--color-text-muted)] mt-1">
                  Contact address shown to students for platform support and queries.
                </p>
              </div>

              <div className="pt-2 border-t border-[color:var(--color-border)]">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowCustomSkills}
                    onChange={(e) => setAllowCustomSkills(e.target.checked)}
                    className="size-4.5 rounded border-[color:var(--color-border)] text-[color:var(--color-primary)] focus:ring-[color:var(--color-primary)]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-[color:var(--color-text)]">
                      Allow Student Custom Skills
                    </span>
                    <p className="text-xs text-[color:var(--color-text-muted)]">
                      When enabled, students can create new custom skills during onboarding or profile editing.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-[color:var(--color-border)] flex items-center justify-end">
                <Button type="submit" disabled={saving} className="flex items-center gap-2">
                  <Save className="size-4" />
                  {saving ? "Saving Changes..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
  );
}
