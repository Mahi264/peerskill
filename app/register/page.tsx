"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertBanner } from "@/components/ui/toast";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("College email is required.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        const code = json?.error?.code;
        if (code === "INVALID_COLLEGE_EMAIL") {
          setErrorMsg("Email must belong to the official college domain.");
        } else if (code === "DUPLICATE_EMAIL") {
          setErrorMsg("An account with this email already exists.");
        } else if (code === "VALIDATION_ERROR") {
          const details = json?.error?.details;
          if (details?.email?.[0]) {
            setErrorMsg(details.email[0]);
          } else if (details?.password?.[0]) {
            setErrorMsg(details.password[0]);
          } else {
            setErrorMsg(json?.error?.message || "Invalid registration input.");
          }
        } else {
          setErrorMsg(json?.error?.message || "Registration failed.");
        }
        return;
      }

      // Registration successful and cookie set -> proceed to onboarding
      router.push("/onboarding");
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[color:var(--color-bg)] flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Header Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[color:var(--color-primary)] text-white font-bold text-lg shadow-sm">
          P
        </div>
        <span className="text-xl font-bold tracking-tight text-[color:var(--color-text)]">
          PeerSkill
        </span>
      </Link>

      <Card className="w-full max-w-[440px] border-[color:var(--color-border)] shadow-[var(--shadow-md)] rounded-[var(--radius-lg)]">
        <CardHeader className="text-center space-y-1.5 pb-2">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] mb-1">
            <ShieldCheck className="size-5" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Join your campus network
          </CardTitle>
          <CardDescription className="text-sm">
            Create an account with your official college email.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {errorMsg && <AlertBanner variant="error" message={errorMsg} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[color:var(--color-text)]">
                College Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="student@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
              <p className="text-xs text-[color:var(--color-text-muted)]">
                Must end with your college domain (e.g. @college.edu)
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[color:var(--color-text)]">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
                minLength={8}
              />
              <p className="text-xs text-[color:var(--color-text-muted)]">
                Minimum 8 characters
              </p>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account
                  <ArrowRight className="size-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center text-sm text-[color:var(--color-text-muted)] border-t border-[color:var(--color-border)]/60">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-[color:var(--color-primary)] hover:underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
