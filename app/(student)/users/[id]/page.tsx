"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  MessageSquare,
  User as UserIcon,
} from "lucide-react";

import { useStudentAuth } from "@/components/auth/student-auth-context";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPublicPeerAcademicSubtitle } from "@/lib/utils";

import {
  CACHE_KEYS,
  getCached,
  setCached,
  subscribe,
  updatePeerConnectionRelationship,
  ViewerConnectionInfo,
} from "@/lib/data-cache";

interface PeerProfileData {
  id: string;
  status: string;
  createdAt: string;
  profile: {
    fullName: string;
    avatarUrl: string | null;
    branch: string | null;
    section: string | null;
    graduationYear: number | null;
    bio: string | null;
    helpAvailable: boolean;
    helpStatus: string | null;
  };
  skills: Array<{
    id: string;
    name: string;
    slug: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MENTOR";
  }>;
  stats: {
    doubtsCount: number;
    answersCount: number;
  };
  viewerConnection?: ViewerConnectionInfo;
}

const LEVEL_VARIANT_MAP: Record<
  string,
  "default" | "outline" | "success" | "warning" | "danger" | "primary" | "accent" | "skill"
> = {
  MENTOR: "success",
  ADVANCED: "skill",
  INTERMEDIATE: "accent",
  BEGINNER: "outline",
};

export default function CampusPeerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  const { user: viewer } = useStudentAuth();

  // Synchronously initialize with cached data to eliminate skeleton flash
  const profileKey = CACHE_KEYS.userProfile(userId);
  const cachedInitial = getCached<PeerProfileData>(profileKey);
  const [peer, setPeer] = React.useState<PeerProfileData | null>(
    cachedInitial ? cachedInitial.data : null
  );
  const [loading, setLoading] = React.useState(!cachedInitial);
  const [error, setError] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  const fetchPeerProfile = React.useCallback(async () => {
    if (!userId) return;
    try {
      const peerRes = await fetch(`/api/users/${userId}`);
      if (!peerRes.ok) {
        if (peerRes.status === 404) {
          setError("Student profile not found or unavailable.");
        } else {
          setError("Failed to load campus peer profile.");
        }
        return;
      }

      const peerJson = await peerRes.json();
      if (peerJson?.data?.user) {
        setPeer(peerJson.data.user);
        setCached(CACHE_KEYS.userProfile(userId), peerJson.data.user, 60_000);
      }
    } catch {
      setError("Network error while loading campus peer profile.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    if (!userId) return;

    let ignore = false;
    async function load() {
      const cached = getCached<PeerProfileData>(CACHE_KEYS.userProfile(userId));
      if (!cached || cached.isStale) {
        try {
          const peerRes = await fetch(`/api/users/${userId}`);
          if (!peerRes.ok) {
            if (!ignore) {
              if (peerRes.status === 404) {
                setError("Student profile not found or unavailable.");
              } else {
                setError("Failed to load campus peer profile.");
              }
            }
            return;
          }

          const peerJson = await peerRes.json();
          if (!ignore && peerJson?.data?.user) {
            setPeer(peerJson.data.user);
            setCached(CACHE_KEYS.userProfile(userId), peerJson.data.user, 60_000);
          }
        } catch {
          if (!ignore) {
            setError("Network error while loading campus peer profile.");
          }
        } finally {
          if (!ignore) {
            setLoading(false);
          }
        }
      }
    }
    void load();

    // Subscribe to relationship changes broadcast from other views (e.g., /connections, /search)
    const unsubRelationship = subscribe(
      CACHE_KEYS.peerConnection(userId),
      (viewerConnection: unknown) => {
        if (viewerConnection) {
          setPeer((prev) =>
            prev ? { ...prev, viewerConnection: viewerConnection as ViewerConnectionInfo } : prev,
          );
        }
      },
    );

    // Subscribe to profile cache updates
    const unsubProfile = subscribe(CACHE_KEYS.userProfile(userId), (updatedProfile: unknown) => {
      if (updatedProfile) {
        setPeer(updatedProfile as PeerProfileData);
      }
    });

    return () => {
      ignore = true;
      unsubRelationship();
      unsubProfile();
    };
  }, [userId]);

  async function handleSendRequest() {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: userId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionMessage(json.error?.message || "Failed to send request.");
        return;
      }
      const newConnection: ViewerConnectionInfo = {
        state: "PENDING_OUTGOING",
        connectionId: json.data?.connection?.id || undefined,
      };
      updatePeerConnectionRelationship(userId, newConnection);
      setPeer((prev) => (prev ? { ...prev, viewerConnection: newConnection } : prev));
      await fetchPeerProfile();
    } catch {
      setActionMessage("Network error while sending request.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAccept() {
    if (!peer?.viewerConnection?.connectionId) return;
    const connId = peer.viewerConnection.connectionId;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(
        `/api/connections/${connId}/accept`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) {
        setActionMessage(json.error?.message || "Failed to accept request.");
        return;
      }
      const newConnection: ViewerConnectionInfo = {
        state: "CONNECTED",
        connectionId: connId,
      };
      updatePeerConnectionRelationship(userId, newConnection);
      setPeer((prev) => (prev ? { ...prev, viewerConnection: newConnection } : prev));
      await fetchPeerProfile();
    } catch {
      setActionMessage("Network error while accepting request.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDecline() {
    if (!peer?.viewerConnection?.connectionId) return;
    const connId = peer.viewerConnection.connectionId;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(
        `/api/connections/${connId}/decline`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) {
        setActionMessage(json.error?.message || "Failed to decline request.");
        return;
      }
      const newConnection: ViewerConnectionInfo = {
        state: "NOT_CONNECTED",
      };
      updatePeerConnectionRelationship(userId, newConnection);
      setPeer((prev) => (prev ? { ...prev, viewerConnection: newConnection } : prev));
      await fetchPeerProfile();
    } catch {
      setActionMessage("Network error while declining request.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelOrRemove() {
    if (!peer?.viewerConnection?.connectionId) return;
    const connId = peer.viewerConnection.connectionId;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(
        `/api/connections/${connId}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) {
        setActionMessage(json.error?.message || "Failed to remove connection.");
        return;
      }
      const newConnection: ViewerConnectionInfo = {
        state: "NOT_CONNECTED",
      };
      updatePeerConnectionRelationship(userId, newConnection);
      setPeer((prev) => (prev ? { ...prev, viewerConnection: newConnection } : prev));
      await fetchPeerProfile();
    } catch {
      setActionMessage("Network error while removing connection.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleOpenConversation() {
    if (!peer) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: peer.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionMessage(json.error?.message || "Failed to open conversation.");
        return;
      }
      if (json?.data?.conversation?.id) {
        router.push(`/messages/${json.data.conversation.id}`);
      }
    } catch {
      setActionMessage("Network error while opening conversation.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center p-12 text-sm text-[color:var(--color-text-muted)] animate-pulse">
        <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin mr-3" />
        <span>Loading campus peer profile...</span>
      </div>
    );
  }

  if (error || !peer) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Home Feed
        </Link>

        <Card className="p-8 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]">
            <UserIcon className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-[color:var(--color-text)]">
            Student Profile Not Found
          </h1>
          <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed max-w-md mx-auto">
            This student profile does not exist, is not active on campus, or is no longer accessible.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/home">
              <Button variant="outline">Go to Home Feed</Button>
            </Link>
            <Link href="/search?tab=peers">
              <Button>Search Campus Peers</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const isSelf = viewer?.id === peer.id;
  const { profile, skills, stats } = peer;
  const viewerConnection = peer.viewerConnection || { state: "NOT_CONNECTED" };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/search?tab=peers"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Campus Peers
      </Link>

      {/* Main Profile Header Card */}
      <Card className="p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <Avatar name={profile.fullName} src={profile.avatarUrl} size="xl" />

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-[color:var(--color-text)]">
                  {profile.fullName}
                </h1>
                <Badge
                  variant={profile.helpAvailable ? "success" : "outline"}
                  className="text-xs px-2.5 py-0.5"
                >
                  {profile.helpAvailable ? "Available to Help" : "Unavailable"}
                </Badge>
              </div>

              <p className="text-sm text-[color:var(--color-text-muted)] font-medium">
                {formatPublicPeerAcademicSubtitle(profile)}
              </p>

              {profile.bio && (
                <p className="text-sm text-[color:var(--color-text)] max-w-xl pt-1 italic leading-relaxed">
                  &ldquo;{profile.bio}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Connection Actions CTA */}
          {isSelf ? (
            <Link href="/profile">
              <Button variant="outline" size="sm">
                Edit My Profile
              </Button>
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              {viewerConnection.state === "NOT_CONNECTED" && (
                <Button
                  onClick={handleSendRequest}
                  disabled={actionLoading}
                  className="gap-2"
                >
                  Connect
                </Button>
              )}

              {viewerConnection.state === "PENDING_OUTGOING" && (
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="text-xs py-1 px-2.5">
                    Request Pending
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelOrRemove}
                    disabled={actionLoading}
                    className="text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-danger)]"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {viewerConnection.state === "PENDING_INCOMING" && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="bg-[color:var(--color-success)] hover:bg-[color:var(--color-success)]/90 text-white text-xs h-8"
                  >
                    Accept Request
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDecline}
                    disabled={actionLoading}
                    className="text-xs h-8 text-[color:var(--color-text-muted)]"
                  >
                    Decline
                  </Button>
                </div>
              )}

              {viewerConnection.state === "CONNECTED" && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleOpenConversation}
                    disabled={actionLoading}
                    className="gap-1.5 text-xs h-8"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>Message</span>
                  </Button>
                  <Badge variant="success" className="text-xs py-1.5 px-3">
                    Connected ✓
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelOrRemove}
                    disabled={actionLoading}
                    className="text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-danger)]"
                  >
                    Remove
                  </Button>
                </div>
              )}

              {viewerConnection.state === "DECLINED_RECENTLY" && (
                <Badge variant="outline" className="text-xs py-1.5 px-3 text-[color:var(--color-text-muted)] bg-[color:var(--color-surface-muted)]">
                  Request Declined
                </Badge>
              )}
            </div>
          )}
        </div>

        {actionMessage && (
          <p className="text-xs font-medium text-[color:var(--color-warning)] bg-[color:var(--color-warning)]/10 p-2.5 rounded-[var(--radius-sm)] border border-[color:var(--color-warning)]/20">
            {actionMessage}
          </p>
        )}

        {/* Help Status Banner */}
        {profile.helpStatus && (
          <div className="rounded-lg border border-[color:var(--color-primary)]/20 bg-[color:var(--color-surface-muted)]/30 px-4 py-2.5 flex items-center gap-2.5 text-xs text-[color:var(--color-text)]">
            <span className="font-semibold text-[color:var(--color-primary)] uppercase tracking-wider text-[10px]">
              Availability Note:
            </span>
            <span>{profile.helpStatus}</span>
          </div>
        )}
      </Card>

      {/* 2-Column Details: Skills & Campus Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Skills List (2 cols on md) */}
        <div className="md:col-span-2 space-y-4">
          <Card className="p-6 space-y-4 shadow-sm">
            <CardHeader className="p-0 pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-[color:var(--color-text)]">
                Campus Skills & Proficiencies
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {skills.length} {skills.length === 1 ? "skill" : "skills"}
              </Badge>
            </CardHeader>

            {skills.length === 0 ? (
              <p className="text-xs text-[color:var(--color-text-muted)] py-2">
                No skills listed yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[color:var(--color-border)] bg-white shadow-xs"
                  >
                    <span className="text-sm font-semibold text-[color:var(--color-text)]">
                      {skill.name}
                    </span>
                    <Badge
                      variant={LEVEL_VARIANT_MAP[skill.level] || "outline"}
                      className="text-[11px] font-medium uppercase tracking-wider"
                    >
                      {skill.level.toLowerCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Campus Activity (1 col on md) */}
        <div className="space-y-4">
          <Card className="p-6 space-y-4 shadow-sm">
            <CardHeader className="p-0 pb-1">
              <CardTitle className="text-lg font-bold text-[color:var(--color-text)]">
                Campus Contributions
              </CardTitle>
            </CardHeader>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/30">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                    <HelpCircle className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-xs text-[color:var(--color-text-muted)]">Doubts Asked</p>
                    <p className="text-lg font-bold text-[color:var(--color-text)]">
                      {stats.doubtsCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]">
                    <MessageSquare className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-xs text-[color:var(--color-text-muted)]">
                      Answers Contributed
                    </p>
                    <p className="text-lg font-bold text-[color:var(--color-text)]">
                      {stats.answersCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
