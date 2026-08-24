"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Lock,
  Send,
  UserCheck,
  UserX,
} from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormattedMessage } from "@/components/ui/formatted-message";
import {
  FormattedConversationDetails,
  FormattedMessage as MessageType,
} from "@/lib/validations/message";
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

const POLLING_INTERVAL_MS = 3500;

export default function ConversationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.id as string;

  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<UserSession | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [conversation, setConversation] = React.useState<FormattedConversationDetails | null>(null);
  const [messages, setMessages] = React.useState<MessageType[]>([]);

  const [inputText, setInputText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const isScrolledToBottomRef = React.useRef(true);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  const handleScroll = React.useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // User is considered at bottom if within 60px of the bottom edge
    isScrolledToBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
  }, []);

  // 1. Initial Load
  React.useEffect(() => {
    let ignore = false;

    async function load() {
      if (!conversationId) return;
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

        if (!ignore) {
          setUser(u);
          setProfile(p);
        }

        // Fetch conversation details
        const convRes = await fetch(`/api/conversations/${conversationId}`);
        if (!convRes.ok) {
          router.replace("/messages");
          return;
        }
        const convJson = await convRes.json();
        if (!ignore && convJson?.data?.conversation) {
          setConversation(convJson.data.conversation);
        }

        // Fetch initial messages
        const msgRes = await fetch(`/api/conversations/${conversationId}/messages?limit=50`);
        if (msgRes.ok) {
          const msgJson = await msgRes.json();
          if (!ignore && msgJson?.data?.messages) {
            setMessages(msgJson.data.messages);
            setTimeout(() => scrollToBottom("auto"), 50);
          }
        }
      } catch {
        router.replace("/messages");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [conversationId, router, scrollToBottom]);

  // 2. Focus-Aware Client Polling
  React.useEffect(() => {
    if (!conversationId || loading) return;

    async function poll() {
      // Suspend polling when tab is hidden or document not focused
      if (document.hidden) return;

      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages?limit=50`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.messages) {
            setMessages((prev) => {
              const currentIds = new Set(prev.map((m) => m.id));
              const incoming: MessageType[] = json.data.messages;
              const hasNew = incoming.some((m) => !currentIds.has(m.id));

              if (!hasNew && incoming.length === prev.length) {
                return prev;
              }

              if (isScrolledToBottomRef.current) {
                setTimeout(() => scrollToBottom("smooth"), 50);
              }

              return incoming;
            });
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }

    const timer = setInterval(poll, POLLING_INTERVAL_MS);

    function handleVisibilityChange() {
      if (!document.hidden) {
        poll();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationId, loading, scrollToBottom]);

  // 3. Send Message Handler
  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const trimmed = inputText.trim();
    if (!trimmed || sending || !conversation?.peer.isConnected) return;

    setSending(true);
    setSendError(null);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });

      const json = await res.json();
      if (!res.ok) {
        setSendError(json.error?.message || "Failed to send message.");
        return;
      }

      if (json?.data?.message) {
        const newMsg: MessageType = json.data.message;
        setMessages((prev) => [...prev, newMsg]);
        setInputText("");
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    } catch {
      setSendError("Network error while sending message.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function formatTime(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)] text-sm font-medium animate-pulse">
          <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
          <span>Loading conversation...</span>
        </div>
      </main>
    );
  }

  if (!conversation) {
    return null;
  }

  const { peer } = conversation;

  return (
    <AppShell user={user} profile={profile}>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)]">
        {/* Conversation Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 rounded-t-[var(--radius-md)]">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/messages"
              className="p-1.5 -ml-1 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)] rounded-lg transition-colors"
              aria-label="Back to messages"
            >
              <ArrowLeft className="size-5" />
            </Link>

            <Link
              href={`/users/${peer.id}`}
              className="flex items-center gap-3 group min-w-0"
            >
              <Avatar
                name={peer.fullName}
                src={peer.avatarUrl}
                size="md"
                className="shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors truncate">
                  {peer.fullName}
                </h2>
                <p className="text-xs text-[color:var(--color-text-muted)] truncate">
                  {formatPublicPeerAcademicSubtitle(peer)}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {peer.isConnected ? (
              <Badge variant="success" className="gap-1 text-[11px] py-0.5 px-2">
                <UserCheck className="size-3" />
                <span>Connected</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-[11px] py-0.5 px-2 text-amber-800 bg-amber-50 border-amber-300">
                <UserX className="size-3" />
                <span>Disconnected</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Message Thread Scroll Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-[color:var(--color-bg)] border-x border-[color:var(--color-border)]/60"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
              <div className="size-12 rounded-full bg-[color:var(--color-surface-muted)] flex items-center justify-center text-[color:var(--color-text-muted)]">
                <Send className="size-5" />
              </div>
              <h3 className="text-sm font-semibold text-[color:var(--color-text)]">
                No messages yet
              </h3>
              <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs">
                Start the conversation with {peer.fullName} to discuss coursework, doubts, or study topics.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isViewer = m.isSelf;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isViewer ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs text-sm ${
                      isViewer
                        ? "bg-[color:var(--color-primary)] text-white rounded-br-xs"
                        : "bg-[color:var(--color-surface)] text-[color:var(--color-text)] border border-[color:var(--color-border)] rounded-bl-xs"
                    }`}
                  >
                    <FormattedMessage
                      content={m.body}
                      className={isViewer ? "text-white" : "text-[color:var(--color-text)]"}
                    />
                  </div>

                  <span className="text-[10px] text-[color:var(--color-text-muted)] mt-1 px-1">
                    {formatTime(m.createdAt)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer Area */}
        <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 rounded-b-[var(--radius-md)]">
          {peer.isConnected ? (
            <form onSubmit={handleSendMessage} className="space-y-2">
              {sendError && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                  {sendError}
                </div>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${peer.fullName}...`}
                  maxLength={2000}
                  rows={2}
                  disabled={sending}
                  className="flex-1 resize-none rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-2.5 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-primary)] focus:border-[color:var(--color-primary)] transition-all"
                />

                <Button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  size="default"
                  className="h-10 px-4 gap-1.5 shrink-0"
                >
                  <Send className="size-4" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[color:var(--color-text-muted)] px-1">
                <span>Enter to send, Shift+Enter for newline</span>
                <span>{inputText.length} / 2,000</span>
              </div>
            </form>
          ) : (
            <Card className="p-4 bg-amber-50/70 border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-2.5 text-amber-900 text-xs">
                <Lock className="size-4 shrink-0 text-amber-700" />
                <span>
                  You are no longer connected with this classmate. Conversation is read-only.
                </span>
              </div>

              <Link href={`/users/${peer.id}`}>
                <Button variant="outline" size="sm" className="text-xs h-7 border-amber-300 hover:bg-amber-100/50 text-amber-900 shrink-0">
                  View Profile to Reconnect
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
