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

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertBanner } from "@/components/ui/toast";
import { formatPublicPeerAcademicSubtitle } from "@/lib/utils";

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
  skills: {
    id: string;
    name: string;
    level?: string;
  }[];
}

interface ConnectedItem {
  id: string;
  connectedAt: string;
  peer: PeerInfo;
}

interface IncomingItem {
  id: string;
  status: "PENDING";
  createdAt: string;
  requester: PeerInfo;
}

interface OutgoingItem {
  id: string;
  status: "PENDING";
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
  const [activeTab, setActiveTab] = React.useState<"connected" | "incoming" | "outgoing">("connected");
  const [connections, setConnections] = React.useState<ConnectionsData>({
    connected: [],
    incoming: [],
    outgoing: [],
    counts: { connected: 0, incoming: 0, outgoing: 0 },
  });
  const [loading, setLoading] = React.useState(true);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const fetchConnections = React.useCallback(async () => {
    try {
      const res = await fetch("/api/connections");
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setConnections(json.data);
        }
      } else {
        setActionError("Failed to load connections.");
      }
    } catch {
      setActionError("Failed to fetch connections network.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/connections");
        if (res.ok) {
          const json = await res.json();
          if (!ignore && json?.data) {
            setConnections(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to load connections:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleAccept(connectionId: string) {
    setActionLoadingId(connectionId);
    setActionError(null);
    try {
      const res = await fetch(`/api/connections/${connectionId}/accept`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setActionError(json?.error?.message || "Failed to accept connection.");
        return;
      }
      await fetchConnections();
    } catch {
      setActionError("Network error while accepting connection.");
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
      const json = await res.json();
      if (!res.ok) {
        setActionError(json?.error?.message || "Failed to decline connection.");
        return;
      }
      await fetchConnections();
    } catch {
      setActionError("Network error while declining connection.");
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
      const json = await res.json();
      if (!res.ok) {
        setActionError(json?.error?.message || "Failed to remove connection.");
        return;
      }
      await fetchConnections();
    } catch {
      setActionError("Network error while updating connection.");
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
        setActionError(json?.error?.message || "Failed to initiate conversation.");
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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

      {actionError && <AlertBanner variant="error" message={actionError} />}

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
              variant={activeTab === "incoming" ? "outline" : "success"}
              className={`text-[10px] px-1.5 py-0 ${
                activeTab === "incoming" ? "border-white/40 text-white" : ""
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

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((n) => (
            <Card key={n} className="p-5 space-y-3 animate-pulse border-[color:var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-gray-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 1: Connected Peers */}
      {!loading && activeTab === "connected" && (
        <div className="space-y-4">
          {connections.connected.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center space-y-4 border-dashed bg-white border-[color:var(--color-border)] shadow-xs">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]">
                <Users className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[color:var(--color-text)]">
                  No peer connections yet
                </h3>
                <p className="text-xs sm:text-sm text-[color:var(--color-text-muted)] max-w-sm mx-auto leading-relaxed">
                  Connect with verified classmates at MITS to enable private 1-to-1 messaging and technical collaboration.
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                <Link href="/search?tab=peers">
                  <Button size="sm" className="gap-2">
                    <UserPlus className="size-4" />
                    Find Classmates
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connections.connected.map(({ id, peer }) => (
                <Card
                  key={id}
                  className="p-5 border-[color:var(--color-border)] shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/users/${peer.id}`}
                        className="flex items-center gap-3 hover:underline group"
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
                        className="text-[10px] px-2 py-0.5"
                      >
                        {peer.helpAvailable ? "Available" : "Unavailable"}
                      </Badge>
                    </div>

                    {peer.bio && (
                      <p className="text-xs text-[color:var(--color-text-muted)] line-clamp-2 italic">
                        &ldquo;{peer.bio}&rdquo;
                      </p>
                    )}

                    {peer.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {peer.skills.slice(0, 4).map((s) => (
                          <Badge key={s.id} variant="skill" className="text-[10px] py-0 px-2">
                            {s.name}
                          </Badge>
                        ))}
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
                        className="text-xs h-8 gap-1"
                      >
                        <MessageSquare className="size-3" />
                        <span>Message</span>
                      </Button>
                      <Link href={`/users/${peer.id}`}>
                        <Button variant="outline" size="sm" className="text-xs h-8">
                          Profile
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionLoadingId === id}
                        onClick={() => handleCancelOrRemove(id)}
                        className="text-xs h-8 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-danger)]"
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
      {!loading && activeTab === "incoming" && (
        <div className="space-y-4">
          {connections.incoming.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center space-y-4 border-dashed bg-white border-[color:var(--color-border)] shadow-xs">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]">
                <Inbox className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[color:var(--color-text)]">
                  No incoming connection requests
                </h3>
                <p className="text-xs sm:text-sm text-[color:var(--color-text-muted)] max-w-sm mx-auto leading-relaxed">
                  When classmates send you connection invites, they will appear here for your review.
                </p>
              </div>
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
                      className="bg-[color:var(--color-success)] hover:bg-[color:var(--color-success)]/90 text-white text-xs h-8 px-4"
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
      {!loading && activeTab === "outgoing" && (
        <div className="space-y-4">
          {connections.outgoing.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center space-y-4 border-dashed bg-white border-[color:var(--color-border)] shadow-xs">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]">
                <Send className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[color:var(--color-text)]">
                  No outgoing connection requests
                </h3>
                <p className="text-xs sm:text-sm text-[color:var(--color-text-muted)] max-w-sm mx-auto leading-relaxed">
                  You have no pending requests sent to classmates.
                </p>
              </div>
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
                    <Badge variant="warning" className="text-xs py-0.5 px-2.5">
                      Pending
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionLoadingId === id}
                      onClick={() => handleCancelOrRemove(id)}
                      className="text-xs h-8 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-danger)]"
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
  );
}
