#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// Worktree setup runs through a stable script shell: bash on macOS/Linux, but PowerShell
// on Windows. POSIX-only command strings (`VAR=1 cmd` env prefixes, `$VAR` expansion, `cp`,
// `./scripts/*.sh`) cannot express this step portably, so the seeding lives in Node — the
// one interpreter every Remio checkout already depends on.

import { seedRemioHome } from "./seed-dev-home.mjs";

const sourceRoot = process.env.REMIO_SOURCE_CHECKOUT_PATH;
const targetRoot = process.env.REMIO_WORKTREE_PATH || process.cwd();

if (!sourceRoot || sourceRoot === targetRoot) {
  process.exit(0);
}

seedRemioHome(
  process.env.REMIO_DEV_SEED_HOME || join(sourceRoot, ".dev/remio-home"),
  join(targetRoot, ".dev/remio-home"),
);
copyServerEnv();

function copyServerEnv() {
  const source = join(sourceRoot, "packages/server/.env");
  const target = join(targetRoot, "packages/server/.env");

  // Untracked local config. A checkout without one is normal, so this is not a setup failure.
  if (!existsSync(source)) {
    console.log(`  Env:     skipped (${source} missing)`);
    return;
  }

  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target);
  console.log(`  Env:     copied ${source}`);
}
