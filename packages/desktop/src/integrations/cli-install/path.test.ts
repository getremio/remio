import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import path from "node:path";
import { resolveCliInstallSourcePath, resolveCliShimPath } from "./path";

describe("cli-install-path", () => {
  it("uses the bundled shim for packaged macOS installs", () => {
    expect(
      resolveCliInstallSourcePath({
        platform: "darwin",
        isPackaged: true,
        executablePath: "/Applications/Remio.app/Contents/MacOS/Remio",
        shimPath: "/Applications/Remio.app/Contents/Resources/bin/remio",
      }),
    ).toBe("/Applications/Remio.app/Contents/Resources/bin/remio");
  });

  it("prefers the original AppImage path on linux", () => {
    expect(
      resolveCliInstallSourcePath({
        platform: "linux",
        isPackaged: true,
        executablePath: "/tmp/.mount_remio123/remio",
        shimPath: "/tmp/.mount_remio123/resources/bin/remio",
        appImagePath: "/home/user/Applications/Remio.AppImage",
      }),
    ).toBe("/home/user/Applications/Remio.AppImage");
  });

  it("uses the bundled shim for packaged linux installs outside an AppImage", () => {
    expect(
      resolveCliInstallSourcePath({
        platform: "linux",
        isPackaged: true,
        executablePath: "/opt/Remio/Remio",
        shimPath: "/opt/Remio/resources/bin/remio",
      }),
    ).toBe("/opt/Remio/resources/bin/remio");
  });

  it("falls back to the shim on windows and in development", () => {
    expect(
      resolveCliInstallSourcePath({
        platform: "win32",
        isPackaged: true,
        executablePath: "C:\\Users\\user\\AppData\\Local\\Programs\\Remio\\Remio.exe",
        shimPath: "C:\\Users\\user\\AppData\\Local\\Programs\\Remio\\resources\\bin\\remio.cmd",
      }),
    ).toBe("C:\\Users\\user\\AppData\\Local\\Programs\\Remio\\resources\\bin\\remio.cmd");

    expect(
      resolveCliInstallSourcePath({
        platform: "linux",
        isPackaged: false,
        executablePath: "/opt/Remio/remio",
        shimPath: "/opt/Remio/resources/bin/remio",
      }),
    ).toBe("/opt/Remio/resources/bin/remio");
  });
});

describe("CLI executable selection", () => {
  const resolveWorkspaceCli = () =>
    createRequire(import.meta.url).resolve("@getremio/cli/bin/remio");

  it("uses the workspace CLI for an unpackaged Electron launcher", () => {
    expect(
      resolveCliShimPath({
        platform: "linux",
        isPackaged: false,
        executablePath: "/nix/store/electron/bin/electron",
        resolveWorkspaceCli,
      }),
    ).toBe(resolveWorkspaceCli());
  });

  it("uses the application shim for a packaged launcher", () => {
    expect(
      resolveCliShimPath({
        platform: "linux",
        isPackaged: true,
        executablePath: "/opt/Remio/remio",
        resolveWorkspaceCli,
      }),
    ).toBe(path.join("/opt/Remio", "resources", "bin", "remio"));
    expect(
      resolveCliShimPath({
        platform: "darwin",
        isPackaged: true,
        executablePath: "/Applications/Remio.app/Contents/MacOS/Remio",
        resolveWorkspaceCli,
      }),
    ).toBe(path.join("/Applications/Remio.app", "Contents", "Resources", "bin", "remio"));
  });
});
