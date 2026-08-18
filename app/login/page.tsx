"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertBanner } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg("Email and password are required.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        const code = json?.error?.code;
        if (code === "INVALID_CREDENTIALS") {
          setErrorMsg("Invalid email or password.");
        } else if (code === "ACCOUNT_SUSPENDED") {
          setErrorMsg("Account is suspended. Contact moderation for assistance.");
        } else {
          setErrorMsg(json?.error?.message || "Login failed.");
        }
        return;
      }

      // Check status to determine route
      const status = json?.data?.user?.status;
      if (status === "PENDING") {
        router.push("/onboarding");
      } else {
        router.push("/home");
      }
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
            <Lock className="size-5" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome back
          </CardTitle>
          <CardDescription className="text-sm">
            Log in to your verified campus account.
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
              />
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Logging in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Log In
                  <ArrowRight className="size-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center text-sm text-[color:var(--color-text-muted)] border-t border-[color:var(--color-border)]/60">
            Need an account?{" "}
            <Link href="/register" className="font-semibold text-[color:var(--color-primary)] hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
