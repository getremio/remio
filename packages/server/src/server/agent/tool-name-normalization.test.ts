import { describe, expect, it } from "vitest";

import { getRemioToolLeafName, isRemioToolName } from "@getremio/protocol/tool-name-normalization";

describe("isRemioToolName", () => {
  it("detects Claude Code format", () => {
    expect(isRemioToolName("mcp__remio__create_agent")).toBe(true);
    expect(isRemioToolName("mcp__remio__list_agents")).toBe(true);
  });

  it("detects remio_voice variant", () => {
    expect(isRemioToolName("mcp__remio_voice__create_agent")).toBe(true);
    expect(isRemioToolName("remio_voice.create_agent")).toBe(true);
  });

  it("excludes speak tools", () => {
    expect(isRemioToolName("mcp__remio_voice__speak")).toBe(false);
    expect(isRemioToolName("mcp__remio__speak")).toBe(false);
    expect(isRemioToolName("remio.speak")).toBe(false);
  });

  it("detects Codex dot format", () => {
    expect(isRemioToolName("remio.create_agent")).toBe(true);
  });

  it("rejects non-remio tools", () => {
    expect(isRemioToolName("Bash")).toBe(false);
    expect(isRemioToolName("Read")).toBe(false);
    expect(isRemioToolName("mcp__other_server__some_tool")).toBe(false);
  });
});

describe("getRemioToolLeafName", () => {
  it("extracts leaf from Claude Code format", () => {
    expect(getRemioToolLeafName("mcp__remio__create_agent")).toBe("create_agent");
  });

  it("extracts leaf from Codex format", () => {
    expect(getRemioToolLeafName("remio.create_agent")).toBe("create_agent");
    expect(getRemioToolLeafName("remio.list_agents")).toBe("list_agents");
  });

  it("returns null for non-remio tools", () => {
    expect(getRemioToolLeafName("Bash")).toBeNull();
  });
});
