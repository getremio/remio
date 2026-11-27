import { describe, expect, it } from "vitest";
import { assertPluginCompatibility, validatePluginRequirements } from "./plugin-requirements.js";

describe.each(["daemon", "app"] as const)("plugin requirements on %s", (runtime) => {
  it("rejects legacy manifests on the first breaking release with migration instructions", () => {
    expect(() => assertPluginCompatibility({ id: "legacy", version: "0.8.0", runtime })).toThrow(
      /legacy.*<0\.8\.0.*0\.8\.0.*https:\/\/remio.hoshizukimio.moe\/docs\/plugins\/migration/,
    );
  });

  it.each([
    [undefined, "0.7.2"],
    [">=0.8.0", "0.8.0"],
    [">=0.8.0", "0.8.0-beta.1"],
    [">=0.8.0", "1.0.0"],
    ["^0.8.0", "0.8.4"],
    [">=0.8.0-beta.1", "0.8.0-beta.2"],
    [">=0.8.0-beta.1", "0.8.0-beta.1"],
    [">=0.8.0-beta.1", "0.8.0"],
    ["^0.8.0 || ^0.9.0", "0.9.2+build.42"],
  ])("accepts %s on %s", (remio, version) => {
    expect(() =>
      assertPluginCompatibility({ id: "test", requirements: { remio }, version, runtime }),
    ).not.toThrow();
  });

  it.each([
    [undefined, "0.8.0-beta.1"],
    [undefined, "0.9.0"],
    [">=0.8.0", "0.7.2"],
    ["^0.8.0", "0.9.0"],
    ["<0.8.0", "0.8.0-beta.1"],
  ])("rejects %s on %s", (remio, version) => {
    expect(() =>
      assertPluginCompatibility({ id: "test", requirements: { remio }, version, runtime }),
    ).toThrow(`Your ${runtime} is ${version}`);
  });

  it.each(["", "   ", "latest", ">=potato", "0.8.0 nonsense"])(
    "rejects malformed range %s",
    (remio) => {
      expect(() => validatePluginRequirements({ remio })).toThrow("Invalid requirements.remio");
    },
  );

  it.each([null, "unknown"])("fails closed when the runtime version is %s", (version) => {
    expect(() =>
      assertPluginCompatibility({
        id: "test",
        requirements: { remio: "*" },
        version,
        runtime,
      }),
    ).toThrow(`Remio ${runtime} version is unknown`);
  });
});
