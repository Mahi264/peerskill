"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  Lock,
  Send,
  UserCheck,
  UserX,
} from "lucide-react";

import { useStudentAuth } from "@/components/auth/student-auth-context";
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
import {
  CACHE_KEYS,
  getCached,
  setCached,
  subscribe,
  updateCachedConversationMessages,
  updateCachedInboxWithNewMessage,
} from "@/lib/data-cache";

const POLLING_INTERVAL_MS = 3500;

export default function ConversationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.id as string;
  useStudentAuth();

  const metadataKey = CACHE_KEYS.conversationDetails(conversationId);
  const messagesKey = CACHE_KEYS.conversationMessages(conversationId);

  // Synchronously initialize with cached data to eliminate skeleton flash
  const cachedMetadata = getCached<FormattedConversationDetails>(metadataKey);
  const cachedMessages = getCached<MessageType[]>(messagesKey);

  const [conversation, setConversation] = React.useState<FormattedConversationDetails | null>(
    cachedMetadata ? cachedMetadata.data : null,
  );
  const [messages, setMessages] = React.useState<MessageType[]>(
    cachedMessages ? cachedMessages.data : [],
  );
  const [loading, setLoading] = React.useState(!cachedMetadata && !cachedMessages);

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

  // 1. Initial Load & Hydration
  React.useEffect(() => {
    let ignore = false;

    async function load() {
      if (!conversationId) return;

      const cachedMeta = getCached<FormattedConversationDetails>(metadataKey);
      const cachedMsgs = getCached<MessageType[]>(messagesKey);

      if (cachedMsgs?.data && cachedMsgs.data.length > 0) {
        setTimeout(() => scrollToBottom("auto"), 50);
      }

      // Fetch conversation metadata if missing or stale
      if (!cachedMeta || cachedMeta.isStale) {
        try {
          const convRes = await fetch(`/api/conversations/${conversationId}`);
          if (!convRes.ok) {
            if (!ignore && !cachedMeta) {
              router.replace("/messages");
            }
            return;
          }

          const convJson = await convRes.json();
          if (!ignore && convJson?.data?.conversation) {
            setConversation(convJson.data.conversation);
            setCached(metadataKey, convJson.data.conversation, 30_000);
          }
        } catch {
          if (!ignore && !cachedMeta) {
            router.replace("/messages");
            return;
          }
        }
      }

      // Fetch initial messages if missing or stale
      if (!cachedMsgs || cachedMsgs.isStale) {
        try {
          const msgRes = await fetch(`/api/conversations/${conversationId}/messages?limit=50`);
          if (msgRes.ok) {
            const msgJson = await msgRes.json();
            if (!ignore && msgJson?.data?.messages) {
              const merged = updateCachedConversationMessages(conversationId, msgJson.data.messages);
              setMessages(merged);
              setTimeout(() => scrollToBottom("auto"), 50);
            }
          }
        } catch {
          // Tolerate silent network hiccups if cached
        }
      }

      if (!ignore) {
        setLoading(false);
      }
    }

    void load();

    // Subscribe to external updates for this conversation's messages
    const unsubMessages = subscribe(messagesKey, (updatedMessages) => {
      if (updatedMessages) {
        setMessages(updatedMessages as MessageType[]);
      }
    });

    return () => {
      ignore = true;
      unsubMessages();
    };
  }, [conversationId, metadataKey, messagesKey, router, scrollToBottom]);

  // 2. Focus-Aware Real-Time Polling for New Messages
  React.useEffect(() => {
    let isMounted = true;
    let timerId: NodeJS.Timeout | null = null;

    async function poll() {
      // Only poll when the document/window is focused and visible
      if (document.hidden || !conversationId) return;

      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`);
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json?.data?.messages) {
            const incoming: MessageType[] = json.data.messages;
            setMessages((prev) => {
              const hasNew =
                incoming.length !== prev.length ||
                (incoming.length > 0 &&
                  incoming[incoming.length - 1].id !== prev[prev.length - 1]?.id);

              if (hasNew) {
                const merged = updateCachedConversationMessages(conversationId, incoming);
                const newest = merged[merged.length - 1];
                if (newest) {
                  updateCachedInboxWithNewMessage(conversationId, newest, conversation?.peer);
                }
                if (isScrolledToBottomRef.current) {
                  setTimeout(() => scrollToBottom("smooth"), 50);
                }
                return merged;
              }
              return prev;
            });
          }
        }
      } catch {
        // Silently tolerate background poll hiccups
      }
    }

    function schedulePoll() {
      timerId = setTimeout(async () => {
        await poll();
        if (isMounted) {
          schedulePoll();
        }
      }, POLLING_INTERVAL_MS);
    }

    schedulePoll();

    // Re-sync immediately upon returning to tab focus
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void poll();
      }
    };

    window.addEventListener("focus", poll);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
      window.removeEventListener("focus", poll);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationId, conversation?.peer, scrollToBottom]);

  // 3. Send Message
  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

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
        setSendError(json?.error?.message || "Failed to send message.");
        return;
      }

      if (json?.data?.message) {
        const newMsg: MessageType = json.data.message;
        const updated = updateCachedConversationMessages(conversationId, newMsg);
        updateCachedInboxWithNewMessage(conversationId, newMsg, conversation?.peer);
        setMessages(updated);
        setInputText("");
        isScrolledToBottomRef.current = true;
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
      <div className="max-w-4xl mx-auto flex items-center justify-center p-12 text-sm text-[color:var(--color-text-muted)] animate-pulse">
        <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin mr-3" />
        <span>Loading conversation...</span>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  const { peer } = conversation;

  return (
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
      <div className="p-3 bg-[color:var(--color-bg)] border-x border-b border-[color:var(--color-border)]/60 rounded-b-[var(--radius-md)]">
        {peer.isConnected ? (
          <form onSubmit={handleSendMessage} className="space-y-2">
            {sendError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {sendError}
              </div>
            )}

            {/* Unified Chat Input Box */}
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] transition-colors focus-within:border-[color:var(--color-primary)]/50">
              {/* Text Input Area */}
              <div className="p-3.5 pb-2">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${peer.fullName}...`}
                  maxLength={2000}
                  rows={2}
                  disabled={sending}
                  className="w-full resize-none border-0 bg-transparent p-0 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-muted)] focus:outline-none focus:ring-0 leading-relaxed"
                />
              </div>

              {/* Bottom Action Row with Subtle Divider */}
              <div className="border-t border-[color:var(--color-border)]/40 px-3.5 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-[color:var(--color-text-muted)]">
                  <span>Enter to send</span>
                  <span className="opacity-40">•</span>
                  <span>Shift+Enter for newline</span>
                </div>

                <div className="flex items-center gap-3">
                  {inputText.length > 0 && (
                    <span className="text-[11px] text-[color:var(--color-text-muted)]">
                      {inputText.length}/2,000
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    aria-label="Send message"
                    title="Send message"
                    className="relative group shrink-0 h-10 w-20 rounded-full flex items-center justify-center transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-1 disabled:opacity-35 disabled:cursor-not-allowed hover:enabled:brightness-105 active:enabled:scale-95"
                    style={{
                      background:
                        "radial-gradient(ellipse at 50% 50%, #145c54 0%, #197268 38%, #289e90 75%, #5eead4 100%)",
                    }}
                  >
                    <ArrowUp
                      className="size-5 text-white transition-transform duration-150 group-hover:enabled:-translate-y-0.5"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </button>
                </div>
              </div>
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
  );
}
