import { describe, expect, test } from "vitest";

import { MutableDaemonConfigPatchSchema, MutableDaemonConfigSchema } from "./messages.js";
import { ProviderOverrideSchema, ProviderRemioToolsPolicySchema } from "./provider-config.js";

describe("provider Remio-tool policy", () => {
  test("accepts arbitrary tool IDs and leaves an empty policy enabled by default", () => {
    expect(
      ProviderRemioToolsPolicySchema.parse({
        disabledTools: ["future_tool", "browser_future_tool"],
      }),
    ).toEqual({
      disabledTools: ["future_tool", "browser_future_tool"],
    });
    expect(ProviderRemioToolsPolicySchema.parse({})).toEqual({});
    expect(ProviderOverrideSchema.parse({}).remioTools).toBeUndefined();
  });

  test("accepts remioTools on persisted provider overrides", () => {
    expect(
      ProviderOverrideSchema.parse({
        extends: "claude",
        remioTools: {
          enabled: false,
          disabledTools: ["create_workspace"],
        },
      }).remioTools,
    ).toEqual({
      enabled: false,
      disabledTools: ["create_workspace"],
    });
  });

  test("accepts remioTools when reading and patching mutable daemon providers", () => {
    expect(
      MutableDaemonConfigSchema.parse({
        mcp: { injectIntoAgents: true },
        providers: {
          codex: {
            remioTools: { enabled: false, disabledTools: ["future_tool"] },
          },
        },
      }).providers.codex?.remioTools,
    ).toEqual({
      enabled: false,
      disabledTools: ["future_tool"],
    });

    expect(
      MutableDaemonConfigPatchSchema.parse({
        providers: {
          codex: {
            remioTools: { disabledTools: ["browser_future_tool"] },
          },
        },
      }).providers?.codex?.remioTools,
    ).toEqual({ disabledTools: ["browser_future_tool"] });
  });
});
