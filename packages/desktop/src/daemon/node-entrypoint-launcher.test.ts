import { describe, expect, it } from "vitest";
import {
  createNodeEntrypointInvocation,
  type NodeEntrypointSpec,
} from "./node-entrypoint-launcher";

const CLI_ENTRYPOINT: NodeEntrypointSpec = {
  entryPath: "/tmp/remio-cli.js",
  execArgv: ["--import", "tsx"],
};

describe("node-entrypoint-launcher", () => {
  describe("createNodeEntrypointInvocation", () => {
    it("uses the packaged runner when the desktop app is packaged", () => {
      expect(
        createNodeEntrypointInvocation({
          execPath: "/Applications/Remio.app/Contents/MacOS/Remio",
          isPackaged: true,
          packagedRunnerPath:
            "/Applications/Remio.app/Contents/Resources/app.asar/dist/daemon/node-entrypoint-runner.js",
          entrypoint: CLI_ENTRYPOINT,
          argvMode: "node-script",
          args: ["ls", "--json"],
          baseEnv: { PATH: "/usr/bin" },
        }),
      ).toEqual({
        command: "/Applications/Remio.app/Contents/MacOS/Remio",
        args: [
          "--disable-warning=DEP0040",
          "/Applications/Remio.app/Contents/Resources/app.asar/dist/daemon/node-entrypoint-runner.js",
          "node-script",
          "/tmp/remio-cli.js",
          "ls",
          "--json",
        ],
        env: {
          PATH: "/usr/bin",
          ELECTRON_RUN_AS_NODE: "1",
          REMIO_NODE_ENV: "production",
        },
      });
    });

    it("uses the entrypoint directly in development", () => {
      expect(
        createNodeEntrypointInvocation({
          execPath: "/opt/homebrew/bin/electron",
          isPackaged: false,
          packagedRunnerPath: null,
          entrypoint: CLI_ENTRYPOINT,
          argvMode: "node-script",
          args: ["ls"],
          baseEnv: { PATH: "/usr/bin", REMIO_NODE_ENV: "production" },
        }),
      ).toEqual({
        command: "/opt/homebrew/bin/electron",
        args: ["--import", "tsx", "/tmp/remio-cli.js", "ls"],
        env: {
          PATH: "/usr/bin",
          ELECTRON_RUN_AS_NODE: "1",
          REMIO_NODE_ENV: "development",
        },
      });
    });

    it("forces packaged launches to production even when NODE_ENV is inherited as development", () => {
      expect(
        createNodeEntrypointInvocation({
          execPath: "/Applications/Remio.app/Contents/MacOS/Remio",
          isPackaged: true,
          packagedRunnerPath:
            "/Applications/Remio.app/Contents/Resources/app.asar/dist/daemon/node-entrypoint-runner.js",
          entrypoint: CLI_ENTRYPOINT,
          argvMode: "node-script",
          args: [],
          baseEnv: { PATH: "/usr/bin", NODE_ENV: "development" },
        }).env,
      ).toMatchObject({
        PATH: "/usr/bin",
        ELECTRON_RUN_AS_NODE: "1",
        NODE_ENV: "development",
        REMIO_NODE_ENV: "production",
      });
    });

    it("keeps node-style argv for packaged script entrypoints", () => {
      expect(
        createNodeEntrypointInvocation({
          execPath: "/Applications/Remio.app/Contents/MacOS/Remio",
          isPackaged: true,
          packagedRunnerPath:
            "/Applications/Remio.app/Contents/Resources/app.asar/dist/daemon/node-entrypoint-runner.js",
          entrypoint: CLI_ENTRYPOINT,
          argvMode: "node-script",
          args: ["--dev"],
          baseEnv: { PATH: "/usr/bin" },
        }),
      ).toEqual({
        command: "/Applications/Remio.app/Contents/MacOS/Remio",
        args: [
          "--disable-warning=DEP0040",
          "/Applications/Remio.app/Contents/Resources/app.asar/dist/daemon/node-entrypoint-runner.js",
          "node-script",
          "/tmp/remio-cli.js",
          "--dev",
        ],
        env: {
          PATH: "/usr/bin",
          ELECTRON_RUN_AS_NODE: "1",
          REMIO_NODE_ENV: "production",
        },
      });
    });
  });
});
