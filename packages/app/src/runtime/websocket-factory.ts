import { nativeWebSocketFactory } from "@getremio/client/internal/daemon-client-websocket-transport";
import type { WebSocketFactory } from "@getremio/client/internal/daemon-client-transport-types";

export function createAppWebSocketFactory(): WebSocketFactory {
  return nativeWebSocketFactory;
}
