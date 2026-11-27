import type { PluginServerContext } from "@getremio/plugin/server";
import { createGooseProvider } from "./server/provider.js";

export default function contribute(server: PluginServerContext) {
  server.registerProvider(createGooseProvider());
  return () => {};
}
