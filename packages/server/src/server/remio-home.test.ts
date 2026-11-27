import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { resolveRemioHome } from "./remio-home.js";
describe("resolveRemioHome", () => {
  test("resolves REMIO_HOME without creating it", () => {
    const parent = mkdtempSync(path.join(tmpdir(), "remio-home-parent-"));
    const remioHome = path.join(parent, "home");
    try {
      expect(resolveRemioHome({ REMIO_HOME: remioHome })).toBe(remioHome);
      expect(existsSync(remioHome)).toBe(false);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});
