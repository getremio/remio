import { runAcpProvider } from "@getremio/plugin/server/acp";
import type { ProviderRegistration } from "@getremio/plugin/server/provider";
import { legacyModes } from "./legacy-modes.js";
import { terminalCommand } from "./terminal-command.js";

export function createHermesProvider(): ProviderRegistration {
  return {
    requiresConfiguration: true,
    ...runAcpProvider({
      id: "hermes",
      label: "Hermes",
      description: "Nous Research self-improving AI agent",
      icon: "icon.svg",
      command: ["hermes", "acp"],
      acpOptions: {
        autoAcceptMode: {
          mode: {
            id: "full-access",
            label: "Full access",
            description: "Approve tool requests without asking.",
            icon: "ShieldOff",
            colorTier: "dangerous",
          },
          nativeMode: "ask",
        },
      },
      transformers: [terminalCommand, legacyModes],
    }),
  };
}
