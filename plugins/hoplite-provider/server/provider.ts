import { runAcpProvider } from "@getremio/plugin/server/acp";
import type { ProviderRegistration } from "@getremio/plugin/server/provider";
import { createHopliteInstallation } from "./installation.js";
import { runPhaseTransformer } from "./run-phase.js";

export function createHopliteProvider(): ProviderRegistration {
  return {
    requiresConfiguration: true,
    ...runAcpProvider({
      id: "hoplite",
      label: "Hoplite",
      description: "Hoplite's coding agent through the local `hoplite acp` bridge",
      icon: "icon.svg",
      command: ["hoplite", "acp"],
      acpOptions: { workspaceOnlyCatalog: true },
      transformers: [runPhaseTransformer],
    }),
    docsUrl: "https://remio.hoshizukimio.moe/docs/supported-providers/hoplite",
    installation: createHopliteInstallation(),
  };
}
