"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  UserPlus,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormattedConversationItem } from "@/lib/validations/message";
import { formatPublicPeerAcademicSubtitle } from "@/lib/utils";

interface UserSession {
  id: string;
  email: string;
  status: string;
  role: string;
}

interface UserProfile {
  fullName: string;
  avatarUrl?: string | null;
}

export default function MessagesInboxPage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<UserSession | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [conversations, setConversations] = React.useState<FormattedConversationItem[]>([]);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.replace("/");
          return;
        }

        const meJson = await meRes.json();
        const u = meJson?.data?.user;
        const p = u?.profile || meJson?.data?.profile || null;

        if (u?.status === "PENDING") {
          router.replace("/onboarding");
          return;
        }

        setUser(u);
        setProfile(p);

        // Fetch conversations
        const convRes = await fetch("/api/conversations");
        if (convRes.ok) {
          const convJson = await convRes.json();
          if (convJson?.data?.conversations) {
            setConversations(convJson.data.conversations);
          }
        }
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  function formatMessageTime(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)] text-sm font-medium animate-pulse">
          <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
          <span>Loading messages...</span>
        </div>
      </main>
    );
  }

  return (
    <AppShell user={user} profile={profile}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[color:var(--color-border)]/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="size-6 text-[color:var(--color-primary)]" />
              <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">
                Campus Messages
              </h1>
            </div>
            <p className="text-sm text-[color:var(--color-text-muted)]">
              Private 1-to-1 academic discussions with your connected MITS peers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/connections">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Users className="size-3.5" />
                Connections
              </Button>
            </Link>
            <Link href="/search?tab=peers">
              <Button size="sm" className="gap-2 text-xs">
                <UserPlus className="size-3.5" />
                Find Peers
              </Button>
            </Link>
          </div>
        </div>

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <Card className="p-12 text-center space-y-4 border-dashed bg-[color:var(--color-surface-muted)]/20">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]">
              <MessageSquare className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[color:var(--color-text)]">
                You don&apos;t have any conversations yet
              </h3>
              <p className="text-xs text-[color:var(--color-text-muted)] max-w-sm mx-auto">
                Connect with classmates in Campus Peers to collaborate directly on doubts and coursework.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/search?tab=peers">
                <Button size="sm" className="gap-2">
                  <UserPlus className="size-4" />
                  Discover Campus Peers
                </Button>
              </Link>
              <Link href="/connections">
                <Button variant="outline" size="sm" className="gap-2">
                  <Users className="size-4" />
                  View Connections
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => {
              const { peer, lastMessage, updatedAt } = conv;
              const displayTime = lastMessage ? lastMessage.createdAt : updatedAt;

              return (
                <Link key={conv.id} href={`/messages/${conv.id}`} className="block group">
                  <Card className="p-4 sm:p-5 border-[color:var(--color-border)] shadow-xs group-hover:border-[color:var(--color-border-focus)] transition-all flex items-start gap-4">
                    <Avatar
                      name={peer.fullName}
                      src={peer.avatarUrl}
                      size="md"
                      className="shrink-0"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-sm font-bold text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors truncate">
                          {peer.fullName}
                        </h3>

                        <span className="text-[11px] text-[color:var(--color-text-muted)] shrink-0 font-medium">
                          {formatMessageTime(displayTime)}
                        </span>
                      </div>

                      <p className="text-xs text-[color:var(--color-text-muted)] truncate">
                        {formatPublicPeerAcademicSubtitle(peer)}
                      </p>

                      <div className="pt-1 flex items-center justify-between gap-3">
                        <p className="text-xs text-[color:var(--color-text-muted)] truncate italic">
                          {lastMessage
                            ? `${lastMessage.senderId === user?.id ? "You: " : ""}${lastMessage.body}`
                            : "No messages yet. Say hello!"}
                        </p>

                        {!peer.isConnected && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0 text-amber-800 bg-amber-50 border-amber-300">
                            Disconnected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
