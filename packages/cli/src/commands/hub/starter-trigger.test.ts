import { describe, expect, it } from "vitest";
import { availableStarterTriggerConnections } from "./starter-trigger.js";

describe("starter trigger connections", () => {
  it("returns only concrete connections that can back the generated trigger", () => {
    expect(
      availableStarterTriggerConnections(
        {
          github: [
            {
              slug: "github-getremio",
              accountLogin: "getremio",
              accountType: "Organization",
              repositories: ["getremio/remio"],
            },
          ],
          slack: [{ slug: "remio", teamName: "Remio" }],
          discord: [{ slug: "remio-discord", guildName: "Remio Discord" }],
          daemons: [],
          linear: [],
        },
        "getremio/remio",
      ),
    ).toEqual([
      {
        id: "github:getremio/remio",
        label: "GitHub — getremio/remio",
        provider: "github",
        filters: { connection: "github-getremio", repo: "getremio/remio" },
      },
      {
        id: "slack:remio",
        label: "Slack — Remio",
        provider: "slack",
        filters: { connection: "remio" },
      },
      {
        id: "discord:remio-discord",
        label: "Discord — Remio Discord",
        provider: "discord",
        filters: { connection: "remio-discord" },
      },
    ]);
  });

  it("does not offer GitHub when the current repository is not connected", () => {
    expect(
      availableStarterTriggerConnections(
        {
          github: [
            {
              slug: "github-getremio",
              accountLogin: "getremio",
              accountType: "Organization",
              repositories: ["getremio/hub"],
            },
          ],
          slack: [],
          discord: [],
          daemons: [],
          linear: [],
        },
        "getremio/remio",
      ),
    ).toEqual([]);
  });
});
