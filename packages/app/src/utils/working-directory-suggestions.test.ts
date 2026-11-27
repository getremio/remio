import { describe, expect, it } from "vitest";
import { buildWorkingDirectorySuggestions } from "./working-directory-suggestions";

describe("buildWorkingDirectorySuggestions", () => {
  it("returns de-duplicated recommendations when query is empty", () => {
    const results = buildWorkingDirectorySuggestions({
      recommendedPaths: ["/Users/me/projects/remio", "/Users/me/projects/remio"],
      serverPaths: ["/Users/me/projects/playground"],
      query: "",
    });

    expect(results).toEqual(["/Users/me/projects/remio"]);
  });

  it("keeps fuzzy recommendation matches before de-duplicated daemon suggestions", () => {
    const results = buildWorkingDirectorySuggestions({
      recommendedPaths: ["/Users/me/projects/remio-desktop", "/Users/me/documents"],
      serverPaths: ["/Users/me/projects/remio-plan", "/Users/me/projects/remio-desktop"],
      query: "remio-",
    });

    expect(results).toEqual(["/Users/me/projects/remio-desktop", "/Users/me/projects/remio-plan"]);
  });

  it("does not reinterpret daemon-ranked suggestions", () => {
    const results = buildWorkingDirectorySuggestions({
      recommendedPaths: [],
      serverPaths: ["/Users/me/projects/remio-desktop"],
      query: "a-query-ranked-by-the-daemon",
    });

    expect(results).toEqual(["/Users/me/projects/remio-desktop"]);
  });

  it("matches recommended paths using the complete path text", () => {
    const results = buildWorkingDirectorySuggestions({
      recommendedPaths: [
        "/Users/me/archive/projects/remio-desktop",
        "/Users/me/projects/remio-desktop",
      ],
      serverPaths: [],
      query: "projects/rem",
    });

    expect(results).toEqual([
      "/Users/me/archive/projects/remio-desktop",
      "/Users/me/projects/remio-desktop",
    ]);
  });

  it("fuzzy-matches recommended paths using their full path", () => {
    const results = buildWorkingDirectorySuggestions({
      recommendedPaths: ["/Users/me/projects/blankpage/editor"],
      serverPaths: [],
      query: "blank page editor",
    });

    expect(results).toEqual(["/Users/me/projects/blankpage/editor"]);
  });

  it("treats '~' as an active query and includes daemon suggestions", () => {
    const results = buildWorkingDirectorySuggestions({
      recommendedPaths: ["/Users/me/projects/remio"],
      serverPaths: ["/Users/me/documents", "/Users/me/projects"],
      query: "~",
    });

    expect(results).toEqual([
      "/Users/me/projects/remio",
      "/Users/me/documents",
      "/Users/me/projects",
    ]);
  });
});
