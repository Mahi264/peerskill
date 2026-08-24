import { z } from "zod";

export const createConversationSchema = z.object({
  peerId: z.string().min(1, "Peer ID is required"),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2,000 characters"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export interface PeerProfileHeader {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  branch: string | null;
  section?: string | null;
  graduationYear: number | null;
  isConnected: boolean;
}

export interface FormattedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  isSelf: boolean;
}

export interface FormattedConversationItem {
  id: string;
  peer: PeerProfileHeader;
  lastMessage: {
    id: string;
    senderId: string;
    body: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormattedConversationDetails {
  id: string;
  peer: PeerProfileHeader;
  createdAt: string;
  updatedAt: string;
}
