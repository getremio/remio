import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve as resolvePath } from "node:path";

// Where the Remio CLI lives, for the PATH entry and REMIO_HOOK_CLI every terminal gets. Kept
// apart from terminal.ts so the daemon can resolve it without loading node-pty.

const require = createRequire(import.meta.url);
const REMIO_CLI_BIN_ENTRY = "@getremio/cli/bin/remio";

export function resolveExternalProcessPath(filePath: string): string {
  return filePath.replace(/\.asar(?=[/\\]|$)/, ".asar.unpacked");
}

export function resolveRemioCliBinDir(): string | null {
  const cliExecutable = resolveRemioCliExecutablePath();
  return cliExecutable ? dirname(cliExecutable) : null;
}

export function resolveRemioCliExecutablePath(): string | null {
  const configuredCli = process.env.REMIO_CLI?.trim();
  if (configuredCli) {
    return resolvePath(configuredCli);
  }

  const cliEntrypoint = resolveRemioCliBinEntrypoint();
  if (!cliEntrypoint) {
    return null;
  }

  const externalCliEntrypoint = resolveExternalProcessPath(cliEntrypoint);
  const npmBinDir = findNpmBinDir(dirname(externalCliEntrypoint));
  if (npmBinDir) {
    const shim = resolveRemioCliShim(npmBinDir);
    if (shim) {
      return shim;
    }
  }

  return externalCliEntrypoint;
}

function resolveRemioCliBinEntrypoint(): string | null {
  try {
    return require.resolve(REMIO_CLI_BIN_ENTRY);
  } catch {
    return null;
  }
}

function findNpmBinDir(startPath: string): string | null {
  let current = startPath;
  while (true) {
    const candidate = join(current, "node_modules", ".bin");
    if (hasRemioCliShim(candidate)) {
      return candidate;
    }

    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function hasRemioCliShim(binDir: string): boolean {
  return resolveRemioCliShim(binDir) !== null;
}

function resolveRemioCliShim(binDir: string): string | null {
  for (const name of remioCliShimNames()) {
    const candidate = join(binDir, name);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function remioCliShimNames(): string[] {
  return process.platform === "win32" ? ["remio.cmd", "remio.exe", "remio"] : ["remio"];
}
