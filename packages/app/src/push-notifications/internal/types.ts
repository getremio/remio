import type { DaemonClient } from "@getremio/client/internal/daemon-client";

export interface StartPushNotificationsInput {
  client: DaemonClient;
  serverId: string;
}

export interface RevokePushNotificationsInput {
  client: DaemonClient | null;
  serverId: string;
}
