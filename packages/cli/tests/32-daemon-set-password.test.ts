#!/usr/bin/env npx tsx

import assert from "node:assert";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Command } from "commander";
import { isBearerTokenValidAsync } from "@getremio/server/auth";
import { runLocalRemio } from "./helpers/local-cli.ts";
import {
  runSetPasswordCommand,
  setDaemonPasswordInConfig,
  type PromptPassword,
} from "../src/commands/daemon/set-password.ts";

console.log("=== Daemon Set Password Command ===\n");

const root = await mkdtemp(join(tmpdir(), "remio-set-password-"));
const remioHome = join(root, ".remio");

function promptSequence(values: string[]): PromptPassword {
  return async () => {
    const value = values.shift();
    if (value === undefined) {
      throw new Error("prompt called too many times");
    }
    return value;
  };
}

try {
  {
    console.log("Test 1: setDaemonPasswordInConfig writes hash and preserves config fields");
    await mkdir(remioHome, { recursive: true });
    await writeFile(
      join(remioHome, "config.json"),
      `${JSON.stringify(
        {
          version: 1,
          daemon: {
            listen: "127.0.0.1:9999",
            relay: { enabled: false },
          },
          app: { baseUrl: "https://app.remio.hoshizukimio.moe" },
        },
        null,
        2,
      )}\n`,
    );

    const result = await setDaemonPasswordInConfig("shared-secret", { home: remioHome });
    const config = JSON.parse(await readFile(join(remioHome, "config.json"), "utf-8"));

    assert.strictEqual(result.configPath, join(remioHome, "config.json"));
    assert.strictEqual(
      result.restartCommand,
      `remio daemon restart --home ${JSON.stringify(remioHome)}`,
    );
    assert.strictEqual(config.daemon.listen, "127.0.0.1:9999");
    assert.strictEqual(config.daemon.relay.enabled, false);
    assert.notStrictEqual(config.daemon.auth.password, "shared-secret");
    assert.match(config.daemon.auth.password, /^\$2[aby]\$12\$/);
    assert.strictEqual(
      await isBearerTokenValidAsync({
        password: config.daemon.auth.password,
        token: "shared-secret",
      }),
      true,
    );
    console.log("✓ set-password writes bcrypt hash without clobbering config\n");
  }

  {
    console.log("Test 2: command prompts twice and accepts matching confirmation");
    const result = await runSetPasswordCommand(
      {
        home: remioHome,
        daemonTarget: { kind: "instance", home: remioHome },
        promptPassword: promptSequence(["new-secret", "new-secret"]),
      },
      {} as Command,
    );
    const config = JSON.parse(await readFile(join(remioHome, "config.json"), "utf-8"));

    assert.strictEqual(result.data.action, "password_set");
    assert.strictEqual(
      await isBearerTokenValidAsync({ password: config.daemon.auth.password, token: "new-secret" }),
      true,
    );
    console.log("✓ command accepts matching confirmation\n");
  }

  {
    console.log("Test 3: command refuses mismatched confirmation");
    await assert.rejects(
      runSetPasswordCommand(
        {
          home: remioHome,
          daemonTarget: { kind: "instance", home: remioHome },
          promptPassword: promptSequence(["first-secret", "second-secret"]),
        },
        {} as Command,
      ),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "PASSWORD_MISMATCH",
    );
    console.log("✓ command refuses password mismatch\n");
  }

  {
    console.log("Test 4: piped stdin fails with a message instead of exiting silently");
    const pipedHome = join(root, "piped");
    await mkdir(pipedHome, { recursive: true });
    const run = runLocalRemio(["daemon", "set-password", "--home", pipedHome, "--json"]);
    run.stdin.end("x\nx\n");
    const result = await run;

    assert.strictEqual(result.exitCode, 1, result.stderr);
    const error = JSON.parse(result.stderr).error as {
      code: string;
      message: string;
      details: string;
    };
    assert.strictEqual(error.code, "PASSWORD_TTY_REQUIRED");
    assert.match(error.message, /needs a terminal/);
    assert.match(error.details, /REMIO_PASSWORD/);
    await assert.rejects(readFile(join(pipedHome, "config.json"), "utf-8"));
    console.log("✓ piped stdin reports that a terminal is required\n");
  }
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log("=== Daemon Set Password Command Tests Passed ===");
