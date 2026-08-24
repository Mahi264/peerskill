import { prisma } from "@/lib/prisma";
import { CONNECTION_RE_REQUEST_COOLDOWN_MS, ViewerConnectionInfo } from "@/lib/validations/connection";

export class ConnectionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "ConnectionError";
  }
}

/**
 * Finds any existing connection between two users in either direction.
 */
export async function findConnectionBetweenUsers(
  userAId: string,
  userBId: string
) {
  return prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: userAId, receiverId: userBId },
        { requesterId: userBId, receiverId: userAId },
      ],
    },
  });
}

/**
 * Determines the viewer's connection state relative to a target user.
 */
export async function getViewerConnectionInfo(
  viewerId: string,
  targetUserId: string
): Promise<ViewerConnectionInfo> {
  if (viewerId === targetUserId) {
    return { state: "SELF" };
  }

  const conn = await findConnectionBetweenUsers(viewerId, targetUserId);
  if (!conn) {
    return { state: "NOT_CONNECTED" };
  }

  if (conn.status === "ACCEPTED") {
    return { state: "CONNECTED", connectionId: conn.id };
  }

  if (conn.status === "PENDING") {
    if (conn.requesterId === viewerId) {
      return { state: "PENDING_OUTGOING", connectionId: conn.id };
    } else {
      return { state: "PENDING_INCOMING", connectionId: conn.id };
    }
  }

  if (conn.status === "DECLINED") {
    const elapsed = Date.now() - new Date(conn.updatedAt).getTime();
    if (elapsed < CONNECTION_RE_REQUEST_COOLDOWN_MS) {
      const canReRequestAt = new Date(
        new Date(conn.updatedAt).getTime() + CONNECTION_RE_REQUEST_COOLDOWN_MS
      ).toISOString();
      return {
        state: "DECLINED_RECENTLY",
        connectionId: conn.id,
        canReRequestAt,
      };
    }
    return { state: "NOT_CONNECTED", connectionId: conn.id };
  }

  return { state: "NOT_CONNECTED" };
}

/**
 * Sends a connection request or auto-resolves a reverse pending request.
 */
export async function sendConnectionRequest(
  requesterId: string,
  receiverId: string
) {
  if (requesterId === receiverId) {
    throw new ConnectionError(
      "You cannot send a connection request to yourself.",
      "SELF_CONNECTION_NOT_ALLOWED",
      400
    );
  }

  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, status: true },
  });

  if (!receiver) {
    throw new ConnectionError("Peer not found.", "USER_NOT_FOUND", 404);
  }

  if (receiver.status !== "ACTIVE") {
    throw new ConnectionError(
      "Cannot connect with an inactive or suspended student.",
      "ACCOUNT_INACTIVE",
      403
    );
  }

  // Atomic lookup & upsert logic inside a transaction to prevent race conditions
  return prisma.$transaction(async (tx) => {
    const existing = await tx.connection.findFirst({
      where: {
        OR: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        throw new ConnectionError(
          "You are already connected to this classmate.",
          "CONNECTION_ALREADY_EXISTS",
          409
        );
      }

      if (existing.status === "PENDING") {
        if (existing.requesterId === requesterId) {
          throw new ConnectionError(
            "You already have a pending connection request to this peer.",
            "REQUEST_ALREADY_PENDING",
            409
          );
        }

        // Reverse request: B previously requested A, and now A requests B -> Auto-resolve to ACCEPTED!
        const accepted = await tx.connection.update({
          where: { id: existing.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        });
        return { connection: accepted, autoAccepted: true };
      }

      if (existing.status === "DECLINED") {
        const elapsed = Date.now() - new Date(existing.updatedAt).getTime();
        if (elapsed < CONNECTION_RE_REQUEST_COOLDOWN_MS) {
          const remainingMinutes = Math.ceil(
            (CONNECTION_RE_REQUEST_COOLDOWN_MS - elapsed) / (60 * 1000)
          );
          throw new ConnectionError(
            `Connection request was recently declined. Please wait ${remainingMinutes} minutes before trying again.`,
            "COOLDOWN_ACTIVE",
            429
          );
        }

        // Cooldown passed: reset the existing declined row to a fresh PENDING request
        const renewed = await tx.connection.update({
          where: { id: existing.id },
          data: {
            requesterId,
            receiverId,
            status: "PENDING",
            acceptedAt: null,
            createdAt: new Date(),
          },
        });
        return { connection: renewed, autoAccepted: false };
      }
    }

    const created = await tx.connection.create({
      data: {
        requesterId,
        receiverId,
        status: "PENDING",
      },
    });

    return { connection: created, autoAccepted: false };
  });
}

/**
 * Accepts an incoming connection request.
 */
export async function acceptConnection(userId: string, connectionId: string) {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new ConnectionError("Connection request not found.", "NOT_FOUND", 404);
  }

  if (connection.receiverId !== userId) {
    throw new ConnectionError(
      "You are not authorized to accept this connection request.",
      "FORBIDDEN",
      403
    );
  }

  if (connection.status !== "PENDING") {
    throw new ConnectionError(
      `Cannot accept request in ${connection.status} state.`,
      "INVALID_STATE",
      400
    );
  }

  return prisma.connection.update({
    where: { id: connectionId },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });
}

/**
 * Declines an incoming connection request.
 */
export async function declineConnection(userId: string, connectionId: string) {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new ConnectionError("Connection request not found.", "NOT_FOUND", 404);
  }

  if (connection.receiverId !== userId) {
    throw new ConnectionError(
      "You are not authorized to decline this connection request.",
      "FORBIDDEN",
      403
    );
  }

  if (connection.status !== "PENDING") {
    throw new ConnectionError(
      `Cannot decline request in ${connection.status} state.`,
      "INVALID_STATE",
      400
    );
  }

  return prisma.connection.update({
    where: { id: connectionId },
    data: {
      status: "DECLINED",
    },
  });
}

/**
 * Cancels a pending outgoing request or removes an active connection.
 */
export async function removeOrCancelConnection(
  userId: string,
  connectionId: string
) {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new ConnectionError("Connection not found.", "NOT_FOUND", 404);
  }

  const isRequester = connection.requesterId === userId;
  const isReceiver = connection.receiverId === userId;

  if (!isRequester && !isReceiver) {
    throw new ConnectionError(
      "You are not a participant in this connection.",
      "FORBIDDEN",
      403
    );
  }

  if (connection.status === "PENDING" && !isRequester) {
    throw new ConnectionError(
      "Only the requester can cancel a pending request. Use decline instead.",
      "FORBIDDEN",
      403
    );
  }

  await prisma.connection.delete({
    where: { id: connectionId },
  });

  return { success: true };
}

/**
 * Lists user connections, incoming requests, and outgoing requests.
 */
export async function listUserConnections(userId: string) {
  const [acceptedConnections, incomingRequests, outgoingRequests] =
    await Promise.all([
      // 1. Accepted mutual connections
      prisma.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: userId }, { receiverId: userId }],
        },
        include: {
          requester: {
            select: {
              id: true,
              email: true,
              status: true,
              profile: {
                select: {
                  fullName: true,
                  avatarUrl: true,
                  branch: true,
                  section: true,
                  graduationYear: true,
                  bio: true,
                  helpAvailable: true,
                  helpStatus: true,
                },
              },
              userSkills: {
                include: { skill: true },
              },
            },
          },
          receiver: {
            select: {
              id: true,
              email: true,
              status: true,
              profile: {
                select: {
                  fullName: true,
                  avatarUrl: true,
                  branch: true,
                  section: true,
                  graduationYear: true,
                  bio: true,
                  helpAvailable: true,
                  helpStatus: true,
                },
              },
              userSkills: {
                include: { skill: true },
              },
            },
          },
        },
        orderBy: { acceptedAt: "desc" },
      }),

      // 2. Incoming pending requests
      prisma.connection.findMany({
        where: {
          status: "PENDING",
          receiverId: userId,
        },
        include: {
          requester: {
            select: {
              id: true,
              email: true,
              status: true,
              profile: {
                select: {
                  fullName: true,
                  avatarUrl: true,
                  branch: true,
                  section: true,
                  graduationYear: true,
                  bio: true,
                  helpAvailable: true,
                  helpStatus: true,
                },
              },
              userSkills: {
                include: { skill: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // 3. Outgoing pending requests
      prisma.connection.findMany({
        where: {
          status: "PENDING",
          requesterId: userId,
        },
        include: {
          receiver: {
            select: {
              id: true,
              email: true,
              status: true,
              profile: {
                select: {
                  fullName: true,
                  avatarUrl: true,
                  branch: true,
                  section: true,
                  graduationYear: true,
                  bio: true,
                  helpAvailable: true,
                  helpStatus: true,
                },
              },
              userSkills: {
                include: { skill: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const connected = acceptedConnections
    .map((conn) => {
      const peer = conn.requesterId === userId ? conn.receiver : conn.requester;
      if (peer.status !== "ACTIVE") return null;

      return {
        id: conn.id,
        connectedAt: conn.acceptedAt?.toISOString() || conn.updatedAt.toISOString(),
        peer: {
          id: peer.id,
          fullName: peer.profile?.fullName || "Peer Student",
          avatarUrl: peer.profile?.avatarUrl || null,
          branch: peer.profile?.branch || null,
          section: peer.profile?.section || null,
          graduationYear: peer.profile?.graduationYear || null,
          bio: peer.profile?.bio || null,
          helpAvailable: peer.profile?.helpAvailable ?? true,
          helpStatus: peer.profile?.helpStatus || null,
          skills: peer.userSkills.map((us) => ({
            id: us.skill.id,
            name: us.skill.name,
            slug: us.skill.slug,
            level: us.level,
          })),
        },
      };
    })
    .filter(Boolean);

  const incoming = incomingRequests
    .map((conn) => {
      const req = conn.requester;
      if (req.status !== "ACTIVE") return null;

      return {
        id: conn.id,
        createdAt: conn.createdAt.toISOString(),
        requester: {
          id: req.id,
          fullName: req.profile?.fullName || "Peer Student",
          avatarUrl: req.profile?.avatarUrl || null,
          branch: req.profile?.branch || null,
          section: req.profile?.section || null,
          graduationYear: req.profile?.graduationYear || null,
          bio: req.profile?.bio || null,
          helpAvailable: req.profile?.helpAvailable ?? true,
          skills: req.userSkills.map((us) => ({
            id: us.skill.id,
            name: us.skill.name,
            slug: us.skill.slug,
            level: us.level,
          })),
        },
      };
    })
    .filter(Boolean);

  const outgoing = outgoingRequests
    .map((conn) => {
      const rec = conn.receiver;
      if (rec.status !== "ACTIVE") return null;

      return {
        id: conn.id,
        createdAt: conn.createdAt.toISOString(),
        receiver: {
          id: rec.id,
          fullName: rec.profile?.fullName || "Peer Student",
          avatarUrl: rec.profile?.avatarUrl || null,
          branch: rec.profile?.branch || null,
          section: rec.profile?.section || null,
          graduationYear: rec.profile?.graduationYear || null,
          bio: rec.profile?.bio || null,
          helpAvailable: rec.profile?.helpAvailable ?? true,
          skills: rec.userSkills.map((us) => ({
            id: us.skill.id,
            name: us.skill.name,
            slug: us.skill.slug,
            level: us.level,
          })),
        },
      };
    })
    .filter(Boolean);

  return {
    connected,
    incoming,
    outgoing,
    counts: {
      connected: connected.length,
      incoming: incoming.length,
      outgoing: outgoing.length,
    },
  };
}
