import { prisma } from "@/lib/prisma";
import {
  FormattedConversationDetails,
  FormattedConversationItem,
  FormattedMessage,
  PeerProfileHeader,
} from "@/lib/validations/message";

export class MessagingError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = "MessagingError";
  }
}

/**
 * Returns the lexicographically sorted user pair to guarantee uniqueness invariant.
 */
export function getCanonicalUserPair(userAId: string, userBId: string): {
  userOneId: string;
  userTwoId: string;
} {
  return userAId < userBId
    ? { userOneId: userAId, userTwoId: userBId }
    : { userOneId: userBId, userTwoId: userAId };
}

/**
 * Checks if two users have an active, accepted mutual connection.
 */
export async function areUsersConnected(userAId: string, userBId: string): Promise<boolean> {
  const connection = await prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: userAId, receiverId: userBId, status: "ACCEPTED" },
        { requesterId: userBId, receiverId: userAId, status: "ACCEPTED" },
      ],
    },
    select: { id: true },
  });

  return Boolean(connection);
}

/**
 * Opens an existing conversation or creates a new 1-to-1 conversation with a connected peer.
 */
export async function getOrCreateConversation(
  userId: string,
  peerId: string,
): Promise<{ conversation: FormattedConversationDetails; isNew: boolean }> {
  if (userId === peerId) {
    throw new MessagingError(
      "Cannot start a conversation with yourself.",
      "SELF_CONVERSATION_NOT_ALLOWED",
      400,
    );
  }

  // 1. Verify target peer exists and is ACTIVE
  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: {
      id: true,
      status: true,
      profile: {
        select: {
          fullName: true,
          avatarUrl: true,
          branch: true,
          section: true,
          graduationYear: true,
        },
      },
    },
  });

  if (!peer || !peer.profile) {
    throw new MessagingError("Classmate profile not found.", "USER_NOT_FOUND", 404);
  }

  if (peer.status !== "ACTIVE") {
    throw new MessagingError(
      "Cannot message an inactive or suspended user.",
      "PEER_INACTIVE",
      403,
    );
  }

  // 2. Verify mutual connection is ACCEPTED
  const isConnected = await areUsersConnected(userId, peerId);
  if (!isConnected) {
    throw new MessagingError(
      "Messaging is available only after both students are connected.",
      "CONNECTION_REQUIRED",
      403,
    );
  }

  const { userOneId, userTwoId } = getCanonicalUserPair(userId, peerId);

  // 3. Find existing or create (with race condition handling)
  try {
    const existing = await prisma.conversation.findUnique({
      where: {
        userOneId_userTwoId: { userOneId, userTwoId },
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (existing) {
      return {
        conversation: {
          id: existing.id,
          peer: {
            id: peer.id,
            fullName: peer.profile.fullName,
            avatarUrl: peer.profile.avatarUrl,
            branch: peer.profile.branch,
            section: peer.profile.section,
            graduationYear: peer.profile.graduationYear,
            isConnected: true,
          },
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString(),
        },
        isNew: false,
      };
    }

    const created = await prisma.conversation.create({
      data: {
        userOneId,
        userTwoId,
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      conversation: {
        id: created.id,
        peer: {
          id: peer.id,
          fullName: peer.profile.fullName,
          avatarUrl: peer.profile.avatarUrl,
          branch: peer.profile.branch,
          section: peer.profile.section,
          graduationYear: peer.profile.graduationYear,
          isConnected: true,
        },
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
      isNew: true,
    };
  } catch (error: unknown) {
    // If concurrent race condition occurred on @@unique([userOneId, userTwoId]), fetch existing
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      const fallback = await prisma.conversation.findUniqueOrThrow({
        where: {
          userOneId_userTwoId: { userOneId, userTwoId },
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        conversation: {
          id: fallback.id,
          peer: {
            id: peer.id,
            fullName: peer.profile.fullName,
            avatarUrl: peer.profile.avatarUrl,
            branch: peer.profile.branch,
            section: peer.profile.section,
            graduationYear: peer.profile.graduationYear,
            isConnected: true,
          },
          createdAt: fallback.createdAt.toISOString(),
          updatedAt: fallback.updatedAt.toISOString(),
        },
        isNew: false,
      };
    }
    throw error;
  }
}

/**
 * Lists all conversations for the authenticated user with latest message previews.
 */
export async function listUserConversations(userId: string): Promise<FormattedConversationItem[]> {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ userOneId: userId }, { userTwoId: userId }],
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      userOneId: true,
      userTwoId: true,
      createdAt: true,
      updatedAt: true,
      userOne: {
        select: {
          id: true,
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
              branch: true,
              section: true,
              graduationYear: true,
            },
          },
        },
      },
      userTwo: {
        select: {
          id: true,
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
              branch: true,
              section: true,
              graduationYear: true,
            },
          },
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          senderId: true,
          body: true,
          createdAt: true,
        },
      },
    },
  });

  if (conversations.length === 0) {
    return [];
  }

  // Extract peer IDs to batch-check active connections
  const peerIds = conversations.map((c) => (c.userOneId === userId ? c.userTwoId : c.userOneId));

  const activeConnections = await prisma.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId, receiverId: { in: peerIds } },
        { requesterId: { in: peerIds }, receiverId: userId },
      ],
    },
    select: {
      requesterId: true,
      receiverId: true,
    },
  });

  const connectedPeerSet = new Set<string>();
  for (const conn of activeConnections) {
    if (conn.requesterId === userId) {
      connectedPeerSet.add(conn.receiverId);
    } else {
      connectedPeerSet.add(conn.requesterId);
    }
  }

  return conversations.map((c) => {
    const isUserOne = c.userOneId === userId;
    const peerUser = isUserOne ? c.userTwo : c.userOne;
    const peerProfile = peerUser.profile;

    const peer: PeerProfileHeader = {
      id: peerUser.id,
      fullName: peerProfile?.fullName || "Classmate",
      avatarUrl: peerProfile?.avatarUrl || null,
      branch: peerProfile?.branch || null,
      section: peerProfile?.section || null,
      graduationYear: peerProfile?.graduationYear || null,
      isConnected: connectedPeerSet.has(peerUser.id),
    };

    const lastMsg = c.messages[0]
      ? {
          id: c.messages[0].id,
          senderId: c.messages[0].senderId,
          body: c.messages[0].body,
          createdAt: c.messages[0].createdAt.toISOString(),
        }
      : null;

    return {
      id: c.id,
      peer,
      lastMessage: lastMsg,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  });
}

/**
 * Gets conversation details and verifies participation.
 */
export async function getConversationDetails(
  conversationId: string,
  userId: string,
): Promise<FormattedConversationDetails> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      userOneId: true,
      userTwoId: true,
      createdAt: true,
      updatedAt: true,
      userOne: {
        select: {
          id: true,
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
              branch: true,
              section: true,
              graduationYear: true,
            },
          },
        },
      },
      userTwo: {
        select: {
          id: true,
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
              branch: true,
              section: true,
              graduationYear: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    throw new MessagingError("Conversation not found.", "CONVERSATION_NOT_FOUND", 404);
  }

  if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
    throw new MessagingError("Access to this conversation is denied.", "FORBIDDEN", 403);
  }

  const isUserOne = conversation.userOneId === userId;
  const peerUser = isUserOne ? conversation.userTwo : conversation.userOne;
  const isConnected = await areUsersConnected(userId, peerUser.id);

  return {
    id: conversation.id,
    peer: {
      id: peerUser.id,
      fullName: peerUser.profile?.fullName || "Classmate",
      avatarUrl: peerUser.profile?.avatarUrl || null,
      branch: peerUser.profile?.branch || null,
      section: peerUser.profile?.section || null,
      graduationYear: peerUser.profile?.graduationYear || null,
      isConnected,
    },
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

/**
 * Fetches message history with cursor-based pagination.
 */
export async function listConversationMessages(
  conversationId: string,
  userId: string,
  cursor?: string,
  limit = 30,
): Promise<{ messages: FormattedMessage[]; nextCursor: string | null; hasMore: boolean }> {
  // 1. Verify participant authorization
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { userOneId: true, userTwoId: true },
  });

  if (!conversation) {
    throw new MessagingError("Conversation not found.", "CONVERSATION_NOT_FOUND", 404);
  }

  if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
    throw new MessagingError("Access to this conversation is denied.", "FORBIDDEN", 403);
  }

  const safeLimit = Math.min(Math.max(1, limit), 50);

  // Fetch newest messages or older messages relative to cursor
  const rawMessages = await prisma.message.findMany({
    where: { conversationId },
    take: safeLimit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      body: true,
      createdAt: true,
    },
  });

  const hasMore = rawMessages.length > safeLimit;
  const slicedMessages = hasMore ? rawMessages.slice(0, safeLimit) : rawMessages;
  const nextCursor = hasMore && slicedMessages.length > 0 ? slicedMessages[slicedMessages.length - 1].id : null;

  // Format and reverse to chronological order (oldest first)
  const formatted: FormattedMessage[] = slicedMessages
    .reverse()
    .map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      isSelf: m.senderId === userId,
    }));

  return {
    messages: formatted,
    nextCursor,
    hasMore,
  };
}

/**
 * Sends a plain-text message in a conversation.
 * Strictly verifies participant membership AND that mutual Connection is currently ACCEPTED.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<FormattedMessage> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new MessagingError("Message cannot be empty.", "VALIDATION_ERROR", 400);
  }

  if (trimmed.length > 2000) {
    throw new MessagingError("Message cannot exceed 2,000 characters.", "VALIDATION_ERROR", 400);
  }

  // 1. Verify conversation and participant
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      userOneId: true,
      userTwoId: true,
    },
  });

  if (!conversation) {
    throw new MessagingError("Conversation not found.", "CONVERSATION_NOT_FOUND", 404);
  }

  if (conversation.userOneId !== senderId && conversation.userTwoId !== senderId) {
    throw new MessagingError("You are not a participant in this conversation.", "FORBIDDEN", 403);
  }

  const peerId = conversation.userOneId === senderId ? conversation.userTwoId : conversation.userOneId;

  // 2. Strict Check: Are users currently connected?
  const isConnected = await areUsersConnected(senderId, peerId);
  if (!isConnected) {
    throw new MessagingError(
      "You are no longer connected with this classmate. Reconnect to send messages.",
      "CONNECTION_REQUIRED",
      403,
    );
  }

  // 3. Create message and update conversation.updatedAt in transaction
  const [createdMessage] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId,
        body: trimmed,
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        body: true,
        createdAt: true,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
      select: { id: true },
    }),
  ]);

  return {
    id: createdMessage.id,
    conversationId: createdMessage.conversationId,
    senderId: createdMessage.senderId,
    body: createdMessage.body,
    createdAt: createdMessage.createdAt.toISOString(),
    isSelf: true,
  };
}
