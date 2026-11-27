import { describe, expect, it } from "vitest";
import { getDesktopDownload, parseReleaseAssetUrl, releasesPageUrl } from "./downloads";
import { EMPTY_RELEASE_CHANNELS } from "./latest-release";

describe("parseReleaseAssetUrl", () => {
  it("accepts a Remio release file", () => {
    const url =
      "https://github.com/getremio/remio/releases/download/v0.10.3/Remio-0.10.3-arm64.dmg";
    expect(parseReleaseAssetUrl(url)).toBe(url);
  });

  it("rejects a path that climbs into another repository's releases", () => {
    expect(
      parseReleaseAssetUrl(
        "https://github.com/getremio/remio/releases/download/v1/../../../../evil/repo/releases/download/v1/app.dmg",
      ),
    ).toBeNull();
    expect(
      parseReleaseAssetUrl(
        "https://github.com/getremio/remio/releases/download/v1/%2e%2e/%2e%2e/%2e%2e/%2e%2e/evil/repo/app.dmg",
      ),
    ).toBeNull();
  });

  it("rejects other hosts and malformed values", () => {
    expect(
      parseReleaseAssetUrl(
        "https://github.com.evil.test/getremio/remio/releases/download/v1/a.dmg",
      ),
    ).toBeNull();
    expect(
      parseReleaseAssetUrl("http://github.com/getremio/remio/releases/download/v1/a.dmg"),
    ).toBeNull();
    expect(parseReleaseAssetUrl("not a url")).toBeNull();
    expect(parseReleaseAssetUrl(undefined)).toBeNull();
  });
});

describe("getDesktopDownload", () => {
  it("falls back to the releases page when no release version is available", () => {
    for (const platform of ["mac", "windows", "linux"] as const) {
      expect(getDesktopDownload(EMPTY_RELEASE_CHANNELS.stable, platform, "en").href).toBe(
        releasesPageUrl,
      );
    }
  });

  it("links through the thanks page when a release version is present", () => {
    const release = {
      version: "0.10.3",
      linuxAppImageAsset: "Remio-x86_64.AppImage",
      windowsX64Asset: "Remio-Setup-0.10.3-x64.exe",
      windowsArm64Asset: "Remio-Setup-0.10.3-arm64.exe",
    };
    expect(getDesktopDownload(release, "mac", "en").href).toMatch(/^\/download\/thanks\?file=/);
    expect(getDesktopDownload(release, "windows", "en").href).toMatch(/^\/download\/thanks\?file=/);
    expect(getDesktopDownload(release, "linux", "en").href).toMatch(/^\/download\/thanks\?file=/);
  });
});
