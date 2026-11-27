import { describe, expect, test } from "vitest";
import type { ProviderRemioToolsPolicy } from "@getremio/protocol/provider-config";

import { isRemioToolEnabled, resolveRemioToolPolicy } from "./remio-tool-policy.js";

describe("Remio tool policy", () => {
  test("defaults to all Remio tools and resolves only the exact provider ID", () => {
    const customPolicy = {
      enabled: true,
      disabledTools: ["list_agents"],
    } satisfies ProviderRemioToolsPolicy;

    expect(
      resolveRemioToolPolicy("custom-claude", {
        claude: { remioTools: { enabled: false } },
        "custom-claude": { remioTools: customPolicy },
      }),
    ).toBe(customPolicy);
    expect(resolveRemioToolPolicy("other-custom", { claude: { remioTools: customPolicy } })).toBe(
      undefined,
    );
    expect(isRemioToolEnabled(undefined, "list_agents")).toBe(true);
  });

  test("applies the provider gate and sparse disabled tools without filtering speak", () => {
    expect(isRemioToolEnabled({ enabled: false }, "list_agents")).toBe(false);
    expect(isRemioToolEnabled({ enabled: false }, "speak")).toBe(true);
    expect(
      isRemioToolEnabled({ enabled: true, disabledTools: ["list_agents"] }, "list_agents"),
    ).toBe(false);
    expect(
      isRemioToolEnabled({ enabled: true, disabledTools: ["list_agents"] }, "create_agent"),
    ).toBe(true);
  });
});
