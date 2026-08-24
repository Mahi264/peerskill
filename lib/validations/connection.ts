import { z } from "zod";

export const CONNECTION_RE_REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export const sendConnectionRequestSchema = z.object({
  receiverId: z.string().min(1, "Recipient user ID is required"),
});

export type SendConnectionRequestInput = z.infer<typeof sendConnectionRequestSchema>;

export type ViewerConnectionState =
  | "SELF"
  | "NOT_CONNECTED"
  | "PENDING_OUTGOING"
  | "PENDING_INCOMING"
  | "CONNECTED"
  | "DECLINED_RECENTLY";

export interface ViewerConnectionInfo {
  state: ViewerConnectionState;
  connectionId?: string;
  canReRequestAt?: string;
}
