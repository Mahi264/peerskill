import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  CACHE_KEYS,
  clearAllCache,
  getCached,
  setCached,
  subscribe,
  updateCachedConversationMessages,
  updateCachedInboxWithNewMessage,
} from "@/lib/data-cache";
import {
  FormattedConversationItem,
  FormattedMessage,
  PeerProfileHeader,
} from "@/lib/validations/message";

describe("Stage 2B: Messaging Inbox & Conversation Synchronization", () => {
  beforeEach(() => {
    clearAllCache();
    vi.restoreAllMocks();
  });

  const mockPeerA: PeerProfileHeader = {
    id: "peer-a",
    fullName: "Aarav Sharma",
    avatarUrl: null,
    branch: "CSE",
    graduationYear: 2026,
    isConnected: true,
  };

  const mockPeerB: PeerProfileHeader = {
    id: "peer-b",
    fullName: "Priya Patel",
    avatarUrl: null,
    branch: "IT",
    graduationYear: 2027,
    isConnected: true,
  };

  it("stores and retrieves inbox conversations with 15s TTL", () => {
    const mockInbox: FormattedConversationItem[] = [
      {
        id: "conv-1",
        peer: mockPeerA,
        lastMessage: {
          id: "m-1",
          senderId: "peer-a",
          body: "Hey there!",
          createdAt: "2026-08-27T10:00:00.000Z",
        },
        createdAt: "2026-08-27T09:00:00.000Z",
        updatedAt: "2026-08-27T10:00:00.000Z",
      },
    ];

    setCached(CACHE_KEYS.INBOX_CONVERSATIONS, mockInbox, 15_000);

    const cached = getCached<FormattedConversationItem[]>(CACHE_KEYS.INBOX_CONVERSATIONS);
    expect(cached).not.toBeNull();
    expect(cached?.data).toHaveLength(1);
    expect(cached?.data[0].lastMessage?.body).toBe("Hey there!");
    expect(cached?.isStale).toBe(false);
  });

  it("immediately updates inbox preview, moves conversation to top, and notifies subscribers upon sending a message", () => {
    const initialInbox: FormattedConversationItem[] = [
      {
        id: "conv-b",
        peer: mockPeerB,
        lastMessage: {
          id: "m-b1",
          senderId: "peer-b",
          body: "See you tomorrow",
          createdAt: "2026-08-27T10:00:00.000Z",
        },
        createdAt: "2026-08-27T09:00:00.000Z",
        updatedAt: "2026-08-27T10:00:00.000Z",
      },
      {
        id: "conv-a",
        peer: mockPeerA,
        lastMessage: {
          id: "m-a1",
          senderId: "peer-a",
          body: "Are you free?",
          createdAt: "2026-08-27T09:30:00.000Z",
        },
        createdAt: "2026-08-27T09:00:00.000Z",
        updatedAt: "2026-08-27T09:30:00.000Z",
      },
    ];

    setCached(CACHE_KEYS.INBOX_CONVERSATIONS, initialInbox, 15_000);

    const inboxListener = vi.fn();
    subscribe(CACHE_KEYS.INBOX_CONVERSATIONS, inboxListener);

    // Student sends a new message to Conversation A
    const newMessage: FormattedMessage = {
      id: "m-a2",
      conversationId: "conv-a",
      senderId: "self-id",
      body: "Yes, let's solve DSA Unit 2!",
      createdAt: "2026-08-27T10:30:00.000Z",
      isSelf: true,
    };

    updateCachedInboxWithNewMessage("conv-a", newMessage, mockPeerA);

    const updatedInbox = getCached<FormattedConversationItem[]>(CACHE_KEYS.INBOX_CONVERSATIONS)?.data;
    expect(updatedInbox).toBeDefined();
    expect(updatedInbox).toHaveLength(2);

    // Conversation A must now be at index 0 (top of inbox)
    expect(updatedInbox?.[0].id).toBe("conv-a");
    expect(updatedInbox?.[0].lastMessage?.body).toBe("Yes, let's solve DSA Unit 2!");
    expect(updatedInbox?.[0].lastMessage?.createdAt).toBe("2026-08-27T10:30:00.000Z");
    expect(updatedInbox?.[0].updatedAt).toBe("2026-08-27T10:30:00.000Z");

    // Conversation B is now at index 1
    expect(updatedInbox?.[1].id).toBe("conv-b");

    // Inbox subscriber must have been called with the updated list
    expect(inboxListener).toHaveBeenCalledWith(updatedInbox);
  });

  it("merges incoming polled messages without duplicating IDs and preserving order", () => {
    const conversationId = "conv-1";

    const initialMessages: FormattedMessage[] = [
      {
        id: "msg-1",
        conversationId,
        senderId: "peer-a",
        body: "Hello",
        createdAt: "2026-08-27T10:00:00.000Z",
        isSelf: false,
      },
      {
        id: "msg-2",
        conversationId,
        senderId: "self-id",
        body: "Hi Aarav",
        createdAt: "2026-08-27T10:01:00.000Z",
        isSelf: true,
      },
    ];

    updateCachedConversationMessages(conversationId, initialMessages);

    // Incoming poll contains msg-2 again + new msg-3
    const polledMessages: FormattedMessage[] = [
      {
        id: "msg-2",
        conversationId,
        senderId: "self-id",
        body: "Hi Aarav",
        createdAt: "2026-08-27T10:01:00.000Z",
        isSelf: true,
      },
      {
        id: "msg-3",
        conversationId,
        senderId: "peer-a",
        body: "Can you help with graphs?",
        createdAt: "2026-08-27T10:02:00.000Z",
        isSelf: false,
      },
    ];

    const merged = updateCachedConversationMessages(conversationId, polledMessages);

    expect(merged).toHaveLength(3);
    expect(merged.map((m) => m.id)).toEqual(["msg-1", "msg-2", "msg-3"]);
    expect(merged[2].body).toBe("Can you help with graphs?");

    const cached = getCached<FormattedMessage[]>(CACHE_KEYS.conversationMessages(conversationId))?.data;
    expect(cached).toEqual(merged);
  });

  it("purges all inbox and conversation caches on clearAllCache() (e.g. on logout)", () => {
    setCached(CACHE_KEYS.INBOX_CONVERSATIONS, [{ id: "conv-1" }], 15_000);
    setCached(CACHE_KEYS.conversationDetails("conv-1"), { id: "conv-1" }, 30_000);
    setCached(CACHE_KEYS.conversationMessages("conv-1"), [{ id: "m-1" }], 30_000);

    clearAllCache();

    expect(getCached(CACHE_KEYS.INBOX_CONVERSATIONS)).toBeNull();
    expect(getCached(CACHE_KEYS.conversationDetails("conv-1"))).toBeNull();
    expect(getCached(CACHE_KEYS.conversationMessages("conv-1"))).toBeNull();
  });
});
