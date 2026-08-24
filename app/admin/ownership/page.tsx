"use client";

import * as React from "react";
import {
  AlertTriangle,
  History,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface AdminInfo {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminOwnershipPage() {
  const [currentAdmin, setCurrentAdmin] = React.useState<AdminInfo | null>(null);
  const [auditHistory, setAuditHistory] = React.useState<AuditLogItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Transfer Form State
  const [targetEmail, setTargetEmail] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;

    async function loadOwnership() {
      try {
        const res = await fetch("/api/admin/ownership");
        if (!res.ok) throw new Error("Failed to load ownership information.");
        const json = await res.json();
        if (!ignore && json?.data) {
          setCurrentAdmin(json.data.currentAdmin);
          setAuditHistory(json.data.auditHistory || []);
        }
      } catch (err: unknown) {
        console.error("Ownership load error:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadOwnership();

    return () => {
      ignore = true;
    };
  }, []);

  async function executeTransfer() {
    if (!targetEmail.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/ownership/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEmail: targetEmail.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to transfer ownership.");
      }

      // Successful transfer immediately logs out current administrator
      alert(json?.data?.message || "Ownership transferred successfully. You are now logged out.");
      window.location.replace("/");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to transfer ownership.");
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminShell>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--color-text)] flex items-center gap-2.5">
            <ShieldAlert className="size-6 text-amber-500" />
            Platform Ownership & Transfer
          </h1>
          <p className="text-sm sm:text-base text-[color:var(--color-text-muted)] mt-1">
            Authoritative platform administrator identity and singleton ownership management.
          </p>
        </div>

        {/* Current Active Administrator Card */}
        {loading ? (
          <Card className="p-6 h-32 animate-pulse" />
        ) : (
          <Card className="p-6 border-l-4 border-l-emerald-500 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                Authoritative Platform Owner
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="size-3.5 text-emerald-700" />
                Active Singleton Admin
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-[color:var(--color-text)] font-mono">
                  {currentAdmin?.email}
                </h2>
                <p className="text-xs text-[color:var(--color-text-muted)] mt-0.5">
                  Display: {currentAdmin?.displayName} • ID: {currentAdmin?.id}
                </p>
              </div>
              <div className="text-xs text-[color:var(--color-text-muted)]">
                Admin since:{" "}
                {currentAdmin?.createdAt ? new Date(currentAdmin.createdAt).toLocaleDateString() : "—"}
              </div>
            </div>
          </Card>
        )}

        {/* Ownership Invariant Warning */}
        <div className="p-4 sm:p-5 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-amber-100/90 text-amber-800 shrink-0 mt-0.5 border border-amber-200">
              <Lock className="size-4.5 text-amber-700" />
            </div>
            <div className="text-xs sm:text-sm leading-relaxed space-y-1">
              <div className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                Single Admin Invariant
              </div>
              <p className="text-amber-900 text-xs sm:text-sm font-normal">
                PeerSkill strictly enforces that exactly <strong className="font-bold text-amber-950">ONE</strong> platform administrator exists. Transferring ownership atomically transitions the authoritative record to the new Google email and instantly revokes all active administrative sessions.
              </p>
            </div>
          </div>
        </div>

        {/* Transfer Ownership Form */}
        <Card className="p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-[color:var(--color-text)]">
              Transfer Platform Administration
            </h3>
            <p className="text-xs text-[color:var(--color-text-muted)] mt-0.5">
              Specify the Google account email address of the successor administrator.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)] mb-1.5">
                Target Successor Google Email
              </label>
              <Input
                type="email"
                placeholder="e.g. successor.admin@gmail.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-[color:var(--color-text-muted)] mt-1">
                The target user must be able to authenticate with this email through Google OAuth.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[color:var(--color-surface-muted)] border border-[color:var(--color-border)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="size-4.5 rounded border-[color:var(--color-border)] text-red-600 focus:ring-red-600 mt-0.5"
              />
              <div className="text-xs text-[color:var(--color-text)]">
                <span className="font-semibold text-red-700">
                  I understand this action is immediate and irreversible.
                </span>
                <p className="text-[color:var(--color-text-muted)] mt-0.5">
                  I will immediately lose all administrative authority over PeerSkill upon transfer.
                </p>
              </div>
            </label>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                disabled={!targetEmail.trim() || !confirmed || submitting}
                onClick={() => setShowConfirmModal(true)}
                className="text-red-600 hover:bg-red-50 border-red-300 font-semibold"
              >
                <LogOut className="size-4 mr-2" />
                Initiate Ownership Transfer
              </Button>
            </div>
          </div>
        </Card>

        {/* Audit History Log */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="size-4.5 text-[color:var(--color-primary)]" />
            <h3 className="text-base font-semibold text-[color:var(--color-text)]">
              Ownership Audit History
            </h3>
          </div>

          {auditHistory.length === 0 ? (
            <Card className="p-6 text-center text-xs text-[color:var(--color-text-muted)]">
              No previous ownership transfer records found.
            </Card>
          ) : (
            <Card className="divide-y divide-[color:var(--color-border)]">
              {auditHistory.map((item) => (
                <div key={item.id} className="p-4 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[color:var(--color-text)]">
                      {item.action}
                    </span>
                    <span className="text-[color:var(--color-text-muted)]">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {item.details && (
                    <div className="text-[color:var(--color-text-muted)] font-mono text-[11px] bg-[color:var(--color-surface-muted)] p-2 rounded-md mt-1">
                      {JSON.stringify(item.details)}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Final Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full p-6 space-y-4 border-red-500 shadow-xl">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="size-7 shrink-0" />
                <h3 className="text-lg font-bold">Confirm Ownership Transfer</h3>
              </div>

              <div className="text-xs text-[color:var(--color-text)] space-y-2 leading-relaxed">
                <p>
                  You are about to transfer full platform administrative ownership to:
                </p>
                <p className="font-mono font-bold text-sm bg-[color:var(--color-surface-muted)] p-2.5 rounded-lg text-center border border-[color:var(--color-border)]">
                  {targetEmail}
                </p>
                <p className="text-red-600 dark:text-red-400 font-semibold">
                  Once confirmed, your current session will be terminated and you will no longer have admin access.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[color:var(--color-border)]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={executeTransfer}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {submitting ? "Transferring..." : "Confirm & Transfer"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
