import { runAcpProvider } from "@getremio/plugin/server/acp";
import type { ProviderRegistration } from "@getremio/plugin/server/provider";
import { fileToolTransformer } from "./file-tools.js";

export function createFxProvider(): ProviderRegistration {
  return {
    requiresConfiguration: true,
    ...runAcpProvider({
      id: "fx",
      label: "fx",
      description: "Vercel Labs' native coding agent through `fx acp`",
      icon: "icon.svg",
      command: ["fx", "acp"],
      transformers: [fileToolTransformer],
    }),
    docsUrl: "https://remio.hoshizukimio.moe/docs/supported-providers/fx",
  };
}
