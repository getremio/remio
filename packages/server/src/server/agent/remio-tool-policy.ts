import type { ProviderRemioToolsPolicy } from "@getremio/protocol/provider-config";

interface ProviderRemioToolSettings {
  remioTools?: ProviderRemioToolsPolicy;
}

export function resolveRemioToolPolicy(
  providerId: string,
  providerSettings: Readonly<Record<string, ProviderRemioToolSettings>> | undefined,
): ProviderRemioToolsPolicy | undefined {
  return providerSettings?.[providerId]?.remioTools;
}

export function isRemioToolEnabled(
  policy: ProviderRemioToolsPolicy | undefined,
  toolName: string,
): boolean {
  if (toolName === "speak") {
    return true;
  }
  if (!isRemioToolPolicyEnabled(policy)) {
    return false;
  }
  return !policy?.disabledTools?.includes(toolName);
}

export function isRemioToolPolicyEnabled(policy: ProviderRemioToolsPolicy | undefined): boolean {
  return policy?.enabled !== false;
}
