import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { writeFile, truncate, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { isPlatform } from "../test-utils/platform.js";
import {
  readRemioConfig,
  RemioConfigSchema,
  RemioConfigRawSchema,
  getWorktreeSetupCommands,
  getWorktreeTeardownCommands,
  getWorktreeTeardownTimeoutMs,
} from "./worktree.js";
import {
  readRemioConfigForEdit,
  statRemioConfigPath,
  writeRemioConfigForEdit,
} from "./remio-config-file.js";

let probeDirectory: string;
let probePath: string;

beforeAll(async () => {
  probeDirectory = mkdtempSync(join(tmpdir(), "remio-config-probe-"));
  probePath = join(probeDirectory, "config-responsiveness.mjs");
  // Compile before starting the measured process. A runtime TypeScript loader
  // owns MessagePorts that the responsiveness probe otherwise charges as work.
  await build({
    entryPoints: [
      fileURLToPath(new URL("./test-fixtures/config-responsiveness.ts", import.meta.url)),
    ],
    outfile: probePath,
    bundle: true,
    platform: "node",
    format: "esm",
  });
});

afterAll(() => {
  rmSync(probeDirectory, { recursive: true, force: true });
});

async function measureConfigRead(directory: string) {
  const { stdout, stderr } = await promisify(execFile)(process.execPath, [probePath, directory], {
    timeout: 15_000,
  });
  process.stderr.write(stderr);
  return JSON.parse(stdout) as {
    result: Awaited<ReturnType<typeof readRemioConfigForEdit>>;
    blockingMs: number;
    filesystemRequests: number;
    yields: number;
    workerMessages: number;
  };
}

describe("remio config file substrate", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = realpathSync(mkdtempSync(join(tmpdir(), "remio-config-file-test-")));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("rejects an oversized config before parsing its otherwise valid JSON", async () => {
    writeFileSync(
      join(tempDir, "remio.json"),
      JSON.stringify({ extra: "x".repeat(2 * 1024 * 1024) }),
    );
    expect(await readRemioConfigForEdit(tempDir)).toEqual({
      ok: false,
      error: { code: "invalid_project_config" },
    });
  });

  it("rejects a sparse oversized file without allocating its contents", async () => {
    const configPath = join(tempDir, "remio.json");
    await writeFile(configPath, "");
    await truncate(configPath, 1024 * 1024 * 1024);
    expect(await readRemioConfigForEdit(tempDir)).toEqual({
      ok: false,
      error: { code: "invalid_project_config" },
    });
  });

  it.skipIf(isPlatform("win32"))("rejects a FIFO without waiting for a writer", async () => {
    await promisify(execFile)("mkfifo", [join(tempDir, "remio.json")]);
    const modulePath = fileURLToPath(new URL("./remio-config-file.ts", import.meta.url));
    const script = `import { readRemioConfigForEdit } from ${JSON.stringify(modulePath)};
      const result = await readRemioConfigForEdit(${JSON.stringify(tempDir)});
      if (JSON.stringify(result) !== JSON.stringify({ok:false,error:{code:"invalid_project_config"}})) process.exit(1);`;
    // Isolate the regression: the old sync reader blocks on the pipe and must be killed.
    await promisify(execFile)(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", script],
      { timeout: 2_000 },
    );
  });

  it("excludes test-runner and loader activity from the config read budget", async () => {
    await writeFile(join(tempDir, "remio.json"), JSON.stringify({ worktree: { setup: "npm ci" } }));
    const unrelatedWork = new Promise<void>((resolve) => {
      setImmediate(() => {
        const threadCpuUsage: (previous?: NodeJS.CpuUsage) => NodeJS.CpuUsage = Reflect.get(
          process,
          "threadCpuUsage",
        );
        const start = threadCpuUsage();
        let elapsed: NodeJS.CpuUsage;
        do {
          elapsed = threadCpuUsage(start);
        } while (elapsed.user + elapsed.system < 60_000);
        resolve();
      });
    });
    const { result, blockingMs, filesystemRequests, workerMessages } =
      await measureConfigRead(tempDir);
    await unrelatedWork;
    expect(workerMessages).toBe(0);
    expect(result).toEqual({
      ok: true,
      config: { worktree: { setup: "npm ci" } },
      revision: await statRemioConfigPath(tempDir),
    });
    expect(filesystemRequests).toBeGreaterThan(0);
    expect(blockingMs).toBeLessThan(20);
  });

  it("keeps main-thread work below 20ms while admitting large configs", async () => {
    const config = {
      scripts: Object.fromEntries(
        Array.from({ length: 7_000 }, (_, i) => [`script${i}`, { command: "echo hi" }]),
      ),
      worktree: { setup: "npm ci" },
    };
    await writeFile(join(tempDir, "remio.json"), JSON.stringify(config));
    const { result, blockingMs, filesystemRequests, yields, workerMessages } =
      await measureConfigRead(tempDir);
    expect(result).toEqual({ ok: true, config, revision: await statRemioConfigPath(tempDir) });
    expect(blockingMs).toBeLessThan(20);
    expect(filesystemRequests).toBeGreaterThan(0);
    expect(yields).toBeGreaterThan(0);
    expect(workerMessages).toBe(0);
  });

  it("rejects a 32MiB config with main-thread work below 20ms", async () => {
    await writeFile(
      join(tempDir, "remio.json"),
      JSON.stringify({ extra: "x".repeat(32 * 1024 * 1024) }),
    );
    const { result, blockingMs, filesystemRequests, workerMessages } =
      await measureConfigRead(tempDir);
    expect(blockingMs).toBeLessThan(20);
    expect(filesystemRequests).toBeGreaterThan(0);
    expect(workerMessages).toBe(0);
    expect(result).toEqual({ ok: false, error: { code: "invalid_project_config" } });
  });

  it.each([
    {
      scripts: Object.fromEntries(
        Array.from({ length: 130 }, (_, i) => [
          `script${i}`,
          { command: "echo hi", extra: { keep: true } },
        ]),
      ),
    },
    {
      scripts: { valid: { command: "echo hi" }, invalid: 42 },
      worktree: { setup: ["one", "", 42] },
    },
    { scripts: ["invalid record"], worktree: { setup: "echo hi" } },
    JSON.parse(
      '{"scripts":{"__proto__":{"command":"echo hi"},"constructor":{"command":"echo hi"}}}',
    ),
  ])("preserves edit and runtime schema behavior with grouped validation (%#)", async (config) => {
    await writeFile(join(tempDir, "remio.json"), JSON.stringify(config));
    const expected = RemioConfigRawSchema.safeParse(config);
    expect(await readRemioConfigForEdit(tempDir)).toEqual(
      expected.success
        ? { ok: true, config: expected.data, revision: await statRemioConfigPath(tempDir) }
        : { ok: false, error: { code: "invalid_project_config" } },
    );
    expect(await readRemioConfig(tempDir)).toEqual({
      ok: true,
      config: RemioConfigSchema.parse(config),
    });
  });

  it("refreshes snapshots after an external edit, repair, and removal", async () => {
    const configPath = join(tempDir, "remio.json");
    await writeFile(configPath, JSON.stringify({ worktree: { setup: "old" } }));
    const original = await readRemioConfig(tempDir);
    expect(original).toEqual({ ok: true, config: { worktree: { setup: ["old"], teardown: [] } } });
    await writeFile(configPath, "{ malformed");
    expect(await readRemioConfigForEdit(tempDir)).toEqual({
      ok: false,
      error: { code: "invalid_project_config" },
    });
    await writeFile(configPath, JSON.stringify({ worktree: { setup: "repaired" } }));
    expect(await readRemioConfig(tempDir)).toEqual({
      ok: true,
      config: { worktree: { setup: ["repaired"], teardown: [] } },
    });
    await rm(configPath);
    expect(await readRemioConfigForEdit(tempDir)).toEqual({
      ok: true,
      config: null,
      revision: null,
    });
  });

  it("serializes competing edits so exactly one matching revision commits", async () => {
    const results = await Promise.all(
      ["first", "second"].map((setup) =>
        writeRemioConfigForEdit({
          repoRoot: tempDir,
          config: { worktree: { setup } },
          expectedRevision: null,
        }),
      ),
    );
    const saved = await readRemioConfigForEdit(tempDir);
    expect(results[0]).toEqual(saved);
    expect(results[1]).toEqual({
      ok: false,
      error: {
        code: "stale_project_config",
        currentRevision: await statRemioConfigPath(tempDir),
      },
    });
  });

  it("returns null config and revision when remio.json is missing", async () => {
    const result = await readRemioConfigForEdit(tempDir);

    expect(result).toEqual({ ok: true, config: null, revision: null });
  });

  it("returns invalid_project_config for invalid JSON", async () => {
    writeFileSync(join(tempDir, "remio.json"), "{ invalid json\n");

    const result = await readRemioConfigForEdit(tempDir);

    expect(result).toEqual({
      ok: false,
      error: { code: "invalid_project_config" },
    });
  });

  it("preserves raw lifecycle string and array forms with a revision token", async () => {
    writeFileSync(
      join(tempDir, "remio.json"),
      JSON.stringify({
        worktree: {
          setup: "npm install",
          teardown: ["npm run clean", "npm run reset"],
        },
      }),
    );

    const result = await readRemioConfigForEdit(tempDir);

    expect(result).toEqual({
      ok: true,
      config: {
        worktree: {
          setup: "npm install",
          teardown: ["npm run clean", "npm run reset"],
        },
      },
      revision: await statRemioConfigPath(tempDir),
    });
  });

  it("keeps runtime lifecycle commands normalized for execution", async () => {
    writeFileSync(
      join(tempDir, "remio.json"),
      JSON.stringify({
        worktree: {
          setup: "npm install",
          teardown: ["npm run clean", "", 42, "npm run reset"],
        },
      }),
    );

    expect(await getWorktreeSetupCommands(tempDir)).toEqual(["npm install"]);
    expect(await getWorktreeTeardownCommands(tempDir)).toEqual(["npm run clean", "npm run reset"]);
  });

  it("reads the teardown time limit and defaults to one minute", async () => {
    expect(await getWorktreeTeardownTimeoutMs(tempDir)).toBe(60_000);

    for (const teardownTimeoutMs of [1, 300_000, 2_147_483_647]) {
      writeFileSync(
        join(tempDir, "remio.json"),
        JSON.stringify({ worktree: { teardownTimeoutMs } }),
      );
      expect(await getWorktreeTeardownTimeoutMs(tempDir)).toBe(teardownTimeoutMs);
    }
  });

  it.each([0, -1000, 1500.5, 2_147_483_648, "90000", null, true, { ms: 90_000 }])(
    "falls back to the default teardown time limit for %j and keeps the commands",
    async (teardownTimeoutMs) => {
      const config = { worktree: { teardown: "npm run clean", teardownTimeoutMs } };
      writeFileSync(join(tempDir, "remio.json"), JSON.stringify(config));

      expect(await getWorktreeTeardownTimeoutMs(tempDir)).toBe(60_000);
      expect(await getWorktreeTeardownCommands(tempDir)).toEqual(["npm run clean"]);
      expect(await readRemioConfigForEdit(tempDir)).toEqual({
        ok: true,
        config,
        revision: await statRemioConfigPath(tempDir),
      });
    },
  );

  it("writes pretty JSON with a trailing newline when revision matches", async () => {
    writeFileSync(join(tempDir, "remio.json"), JSON.stringify({ worktree: { setup: "old" } }));
    const expectedRevision = await statRemioConfigPath(tempDir);

    const result = await writeRemioConfigForEdit({
      repoRoot: tempDir,
      config: { worktree: { setup: "npm install" } },
      expectedRevision,
    });

    expect(result).toEqual({
      ok: true,
      config: { worktree: { setup: "npm install" } },
      revision: await statRemioConfigPath(tempDir),
    });
    expect(readFileSync(join(tempDir, "remio.json"), "utf8")).toBe(
      '{\n  "worktree": {\n    "setup": "npm install"\n  }\n}\n',
    );
  });

  // POSIX-only: Windows mtime granularity can collapse the two revisions in this fixture.
  it.skipIf(isPlatform("win32"))(
    "rejects stale writes when the current revision changed before rename",
    async () => {
      writeFileSync(join(tempDir, "remio.json"), JSON.stringify({ worktree: { setup: "old" } }));
      const expectedRevision = await statRemioConfigPath(tempDir);
      writeFileSync(join(tempDir, "remio.json"), JSON.stringify({ worktree: { setup: "new" } }));
      const currentRevision = await statRemioConfigPath(tempDir);

      const result = await writeRemioConfigForEdit({
        repoRoot: tempDir,
        config: { worktree: { setup: "from editor" } },
        expectedRevision,
      });

      expect(result).toEqual({
        ok: false,
        error: { code: "stale_project_config", currentRevision },
      });
      expect(readFileSync(join(tempDir, "remio.json"), "utf8")).toBe(
        JSON.stringify({ worktree: { setup: "new" } }),
      );
    },
  );

  it("round-trips unknown top-level, worktree, and script-entry fields", async () => {
    const config = {
      extraTop: { keep: true },
      worktree: {
        setup: ["npm install"],
        customWorktreeField: "preserve me",
      },
      scripts: {
        dev: {
          command: "npm run dev",
          type: "service",
          customScriptField: 123,
        },
      },
    };

    const result = await writeRemioConfigForEdit({
      repoRoot: tempDir,
      config,
      expectedRevision: null,
    });

    expect(result).toEqual({
      ok: true,
      config,
      revision: await statRemioConfigPath(tempDir),
    });
    expect(await readRemioConfigForEdit(tempDir)).toEqual({
      ok: true,
      config,
      revision: await statRemioConfigPath(tempDir),
    });
  });

  it("returns write_failed for filesystem write exceptions", async () => {
    const fileRoot = join(tempDir, "not-a-directory");
    writeFileSync(fileRoot, "file");

    const result = await writeRemioConfigForEdit({
      repoRoot: fileRoot,
      config: { worktree: { setup: "npm install" } },
      expectedRevision: null,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "write_failed" },
    });
  });

  it("creates remio.json when the file is still missing and expected revision is null", async () => {
    mkdirSync(join(tempDir, "nested"));

    const result = await writeRemioConfigForEdit({
      repoRoot: join(tempDir, "nested"),
      config: { scripts: { dev: { command: "npm run dev" } } },
      expectedRevision: null,
    });

    expect(result).toEqual({
      ok: true,
      config: { scripts: { dev: { command: "npm run dev" } } },
      revision: await statRemioConfigPath(join(tempDir, "nested")),
    });
  });
});
