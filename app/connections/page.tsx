"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Inbox,
  MessageSquare,
  Send,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

interface PeerInfo {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  branch: string | null;
  section: string | null;
  graduationYear: number | null;
  bio: string | null;
  helpAvailable: boolean;
  helpStatus?: string | null;
  skills: Array<{
    id: string;
    name: string;
    slug: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MENTOR";
  }>;
}

interface ConnectedItem {
  id: string;
  connectedAt: string;
  peer: PeerInfo;
}

interface IncomingItem {
  id: string;
  createdAt: string;
  requester: PeerInfo;
}

interface OutgoingItem {
  id: string;
  createdAt: string;
  receiver: PeerInfo;
}

interface ConnectionsData {
  connected: ConnectedItem[];
  incoming: IncomingItem[];
  outgoing: OutgoingItem[];
  counts: {
    connected: number;
    incoming: number;
    outgoing: number;
  };
}

export default function ConnectionsPage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<UserSession | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [connections, setConnections] = React.useState<ConnectionsData>({
    connected: [],
    incoming: [],
    outgoing: [],
    counts: { connected: 0, incoming: 0, outgoing: 0 },
  });

  const [activeTab, setActiveTab] = React.useState<"connected" | "incoming" | "outgoing">("connected");
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const fetchConnections = React.useCallback(async () => {
    try {
      const res = await fetch("/api/connections");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setConnections(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to load connections:", err);
    }
  }, []);

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

        await fetchConnections();
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router, fetchConnections]);

  async function handleAccept(connectionId: string) {
    setActionLoadingId(connectionId);
    setActionError(null);
    try {
      const res = await fetch(`/api/connections/${connectionId}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        setActionError(json.error?.message || "Failed to accept request.");
        return;
      }
      await fetchConnections();
    } catch {
      setActionError("Network error while accepting request.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDecline(connectionId: string) {
    setActionLoadingId(connectionId);
    setActionError(null);
    try {
      const res = await fetch(`/api/connections/${connectionId}/decline`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        setActionError(json.error?.message || "Failed to decline request.");
        return;
      }
      await fetchConnections();
    } catch {
      setActionError("Network error while declining request.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancelOrRemove(connectionId: string) {
    setActionLoadingId(connectionId);
    setActionError(null);
    try {
      const res = await fetch(`/api/connections/${connectionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        setActionError(json.error?.message || "Failed to remove connection.");
        return;
      }
      await fetchConnections();
    } catch {
      setActionError("Network error while removing connection.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleOpenConversation(peerId: string) {
    setActionLoadingId(peerId);
    setActionError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionError(json.error?.message || "Failed to open conversation.");
        return;
      }
      if (json?.data?.conversation?.id) {
        router.push(`/messages/${json.data.conversation.id}`);
      }
    } catch {
      setActionError("Network error while opening conversation.");
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)] text-sm font-medium animate-pulse">
          <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
          <span>Loading campus connections...</span>
        </div>
      </main>
    );
  }

  return (
    <AppShell user={user} profile={profile}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[color:var(--color-border)]/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Users className="size-6 text-[color:var(--color-primary)]" />
              <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">
                Campus Connections
              </h1>
            </div>
            <p className="text-sm text-[color:var(--color-text-muted)]">
              Your verified MITS peer network for academic collaboration and doubt solving.
            </p>
          </div>

          <Link href="/search?tab=peers">
            <Button className="gap-2">
              <UserPlus className="size-4" />
              Find Classmates
            </Button>
          </Link>
        </div>

        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {actionError}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[color:var(--color-border)] pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("connected")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "connected"
                ? "bg-[color:var(--color-primary)] text-white shadow-xs"
                : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text)]"
            }`}
          >
            <UserCheck className="size-4" />
            <span>Connected</span>
            <Badge
              variant={activeTab === "connected" ? "outline" : "default"}
              className={`text-[10px] px-1.5 py-0 ${
                activeTab === "connected" ? "border-white/40 text-white" : ""
              }`}
            >
              {connections.counts.connected}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("incoming")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "incoming"
                ? "bg-[color:var(--color-primary)] text-white shadow-xs"
                : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text)]"
            }`}
          >
            <Inbox className="size-4" />
            <span>Incoming Requests</span>
            {connections.counts.incoming > 0 && (
              <Badge
                variant="success"
                className={`text-[10px] px-1.5 py-0 ${
                  activeTab === "incoming" ? "bg-white text-emerald-800" : ""
                }`}
              >
                {connections.counts.incoming}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("outgoing")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "outgoing"
                ? "bg-[color:var(--color-primary)] text-white shadow-xs"
                : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text)]"
            }`}
          >
            <Send className="size-4" />
            <span>Outgoing Requests</span>
            <Badge
              variant={activeTab === "outgoing" ? "outline" : "default"}
              className={`text-[10px] px-1.5 py-0 ${
                activeTab === "outgoing" ? "border-white/40 text-white" : ""
              }`}
            >
              {connections.counts.outgoing}
            </Badge>
          </button>
        </div>

        {/* Tab 1: Connected Peers */}
        {activeTab === "connected" && (
          <div className="space-y-4">
            {connections.connected.length === 0 ? (
              <Card className="p-12 text-center space-y-4 border-dashed bg-[color:var(--color-surface-muted)]/20">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]">
                  <Users className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[color:var(--color-text)]">
                    No connections yet
                  </h3>
                  <p className="text-xs text-[color:var(--color-text-muted)] max-w-sm mx-auto">
                    Search campus peers by branch or skills and send connection requests to collaborate on doubts.
                  </p>
                </div>
                <Link href="/search?tab=peers">
                  <Button variant="outline" size="sm" className="gap-2">
                    <UserPlus className="size-4" />
                    Discover Campus Peers
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.connected.map(({ id, peer }) => (
                  <Card
                    key={id}
                    className="p-5 border-[color:var(--color-border)] shadow-xs hover:border-[color:var(--color-border-focus)] transition-colors flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/users/${peer.id}`}
                          className="flex items-center gap-3 hover:underline group flex-1"
                        >
                          <Avatar
                            name={peer.fullName}
                            src={peer.avatarUrl}
                            size="md"
                          />
                          <div>
                            <h3 className="text-sm font-bold text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)]">
                              {peer.fullName}
                            </h3>
                            <p className="text-xs text-[color:var(--color-text-muted)]">
                              {formatPublicPeerAcademicSubtitle(peer)}
                            </p>
                          </div>
                        </Link>

                        <Badge
                          variant={peer.helpAvailable ? "success" : "outline"}
                          className="text-[10px] px-2 py-0.5 shrink-0"
                        >
                          {peer.helpAvailable ? "Available" : "Unavailable"}
                        </Badge>
                      </div>

                      {/* Skills Chips */}
                      {peer.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {peer.skills.slice(0, 3).map((sk) => (
                            <span
                              key={sk.id}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text)] border border-[color:var(--color-border)]"
                            >
                              {sk.name}
                            </span>
                          ))}
                          {peer.skills.length > 3 && (
                            <span className="text-[10px] text-[color:var(--color-text-muted)] self-center">
                              +{peer.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[color:var(--color-border)]/60 text-xs">
                      <span className="text-[11px] text-[color:var(--color-text-muted)]">
                        Connected
                      </span>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={actionLoadingId === peer.id}
                          onClick={() => handleOpenConversation(peer.id)}
                          className="text-xs h-7 gap-1"
                        >
                          <MessageSquare className="size-3" />
                          <span>Message</span>
                        </Button>
                        <Link href={`/users/${peer.id}`}>
                          <Button variant="outline" size="sm" className="text-xs h-7">
                            Profile
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoadingId === id}
                          onClick={() => handleCancelOrRemove(id)}
                          className="text-xs h-7 text-[color:var(--color-text-muted)] hover:text-red-600"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Incoming Requests */}
        {activeTab === "incoming" && (
          <div className="space-y-4">
            {connections.incoming.length === 0 ? (
              <Card className="p-12 text-center space-y-3 border-dashed bg-[color:var(--color-surface-muted)]/20">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]">
                  <Inbox className="size-6" />
                </div>
                <h3 className="text-base font-bold text-[color:var(--color-text)]">
                  No incoming connection requests
                </h3>
                <p className="text-xs text-[color:var(--color-text-muted)] max-w-sm mx-auto">
                  When classmates send you connection invites, they will appear here for your review.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {connections.incoming.map(({ id, requester }) => (
                  <Card
                    key={id}
                    className="p-5 border-[color:var(--color-border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <Link
                      href={`/users/${requester.id}`}
                      className="flex items-center gap-3.5 hover:underline group flex-1"
                    >
                      <Avatar
                        name={requester.fullName}
                        src={requester.avatarUrl}
                        size="md"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)]">
                          {requester.fullName}
                        </h3>
                        <p className="text-xs text-[color:var(--color-text-muted)]">
                          {formatPublicPeerAcademicSubtitle(requester)}
                        </p>
                        {requester.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1.5">
                            {requester.skills.slice(0, 3).map((s) => (
                              <Badge key={s.id} variant="skill" className="text-[9px] py-0 px-1.5">
                                {s.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
                      <Button
                        size="sm"
                        disabled={actionLoadingId === id}
                        onClick={() => handleAccept(id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-4"
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoadingId === id}
                        onClick={() => handleDecline(id)}
                        className="text-xs h-8 text-[color:var(--color-text-muted)]"
                      >
                        Decline
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Outgoing Requests */}
        {activeTab === "outgoing" && (
          <div className="space-y-4">
            {connections.outgoing.length === 0 ? (
              <Card className="p-12 text-center space-y-3 border-dashed bg-[color:var(--color-surface-muted)]/20">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]">
                  <Send className="size-6" />
                </div>
                <h3 className="text-base font-bold text-[color:var(--color-text)]">
                  No outgoing connection requests
                </h3>
                <p className="text-xs text-[color:var(--color-text-muted)] max-w-sm mx-auto">
                  You have no pending requests sent to classmates.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {connections.outgoing.map(({ id, receiver }) => (
                  <Card
                    key={id}
                    className="p-5 border-[color:var(--color-border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <Link
                      href={`/users/${receiver.id}`}
                      className="flex items-center gap-3.5 hover:underline group flex-1"
                    >
                      <Avatar
                        name={receiver.fullName}
                        src={receiver.avatarUrl}
                        size="md"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)]">
                          {receiver.fullName}
                        </h3>
                        <p className="text-xs text-[color:var(--color-text-muted)]">
                          {formatPublicPeerAcademicSubtitle(receiver)}
                        </p>
                      </div>
                    </Link>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <Badge variant="outline" className="text-xs py-1 px-2.5 bg-amber-50 text-amber-800 border-amber-300">
                        Pending
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionLoadingId === id}
                        onClick={() => handleCancelOrRemove(id)}
                        className="text-xs h-8 text-[color:var(--color-text-muted)] hover:text-red-600"
                      >
                        Cancel Request
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
