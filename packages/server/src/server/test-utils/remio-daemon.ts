import { BuiltinPluginLoader } from "../plugins/builtin/index.js";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm } from "node:fs/promises";

import pino from "pino";
import {
  createRemioDaemon,
  type RemioDaemonConfig,
  type RemioOpenAIConfig,
  type RemioSpeechConfig,
} from "../bootstrap.js";
import type { AgentClient, AgentProvider } from "../agent/agent-sdk-types.js";
import { createTestAgentClients } from "./fake-agent-client.js";
import type { PushNotificationSender } from "../push/index.js";
import type { AgentProfile } from "@getremio/protocol/messages";
import type { TailscaleNetwork } from "../listeners.js";

interface TestRemioDaemonOptions {
  daemonVersion?: string;
  desktopManaged?: boolean;
  downloadTokenTtlMs?: number;
  corsAllowedOrigins?: string[];
  hostnames?: RemioDaemonConfig["hostnames"];
  listen?: string;
  listenPort?: number;
  getTailscaleNetwork?: () => TailscaleNetwork;
  logger?: Parameters<typeof createRemioDaemon>[1];
  mcpEnabled?: boolean;
  mcpDebug?: boolean;
  isDev?: boolean;
  relayEnabled?: boolean;
  relayEndpoint?: string;
  relayUseTls?: boolean;
  relayPublicUseTls?: boolean;
  relayRequireProtectedSecurity?: boolean;
  daemonStatusRpcCapability?: boolean;
  relayConfigCapability?: boolean;
  agentClients?: Partial<Record<AgentProvider, AgentClient>>;
  providerOverrides?: RemioDaemonConfig["providerOverrides"];
  providerCatalogRefreshTimeoutMs?: RemioDaemonConfig["providerCatalogRefreshTimeoutMs"];
  remioHomeRoot?: string;
  staticDir?: string;
  cleanup?: boolean;
  openai?: RemioOpenAIConfig;
  // localModelsDir defaults to the local provider's modelsDir, then to a dir under remioHome.
  speech?: Omit<RemioSpeechConfig, "localModelsDir"> & { localModelsDir?: string };
  voiceLlmProvider?: RemioDaemonConfig["voiceLlmProvider"];
  voiceLlmProviderExplicit?: boolean;
  voiceLlmModel?: string | null;
  dictationFinalTimeoutMs?: number;
  auth?: RemioDaemonConfig["auth"];
  pushNotificationSender?: PushNotificationSender;
  serviceProxy?: RemioDaemonConfig["serviceProxy"];
  webUi?: RemioDaemonConfig["webUi"];
  trustedProxies?: RemioDaemonConfig["trustedProxies"];
  agentProfiles?: AgentProfile[];
  autoArchiveAfterMerge?: boolean;
  resumeOnStartup?: boolean;
  resumePrompt?: string;
  pluginsEnabled?: RemioDaemonConfig["pluginsEnabled"];
  pluginRegistryUrl?: RemioDaemonConfig["pluginRegistryUrl"];
  builtinPlugins?: BuiltinPluginLoader;
  lazyTerminalWorker?: boolean;
  plugins?: RemioDaemonConfig["plugins"];
}

export interface TestRemioDaemon {
  config: RemioDaemonConfig;
  daemon: Awaited<ReturnType<typeof createRemioDaemon>>;
  port: number;
  remioHome: string;
  staticDir: string;
  close: () => Promise<void>;
}

const TEST_DAEMON_START_TIMEOUT_MS = 20_000;

async function startDaemonWithTimeout(
  daemon: Awaited<ReturnType<typeof createRemioDaemon>>,
  timeoutMs: number,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      const timeoutError = new Error(
        `Timed out starting test daemon after ${timeoutMs}ms`,
      ) as Error & { code?: string };
      timeoutError.code = "TEST_DAEMON_START_TIMEOUT";
      reject(timeoutError);
    }, timeoutMs);

    daemon.start().then(
      () => {
        clearTimeout(timeoutHandle);
        resolve();
        return;
      },
      (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      },
    );
  });
}

export async function createTestRemioDaemon(
  options: TestRemioDaemonOptions = {},
): Promise<TestRemioDaemon> {
  const maxAttempts = 8;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { config, remioHomeRoot, remioHome, staticDir, createdDirs } =
      await prepareTestDaemonConfig(options);
    const logger = options.logger ?? pino({ level: "silent" });
    const daemon = await createRemioDaemon(config, logger, {
      getTailscaleNetwork: options.getTailscaleNetwork,
      builtinPlugins: options.builtinPlugins ?? new BuiltinPluginLoader(undefined, []),
      lazyTerminalWorker: options.lazyTerminalWorker ?? true,
      serverFeatureOverrides: {
        daemonStatusRpc: options.daemonStatusRpcCapability,
        relayConfig: options.relayConfigCapability,
      },
    });
    try {
      await startDaemonWithTimeout(daemon, TEST_DAEMON_START_TIMEOUT_MS);
      const listenTarget = daemon.getListenTarget();
      if (!listenTarget || listenTarget.type !== "tcp") {
        throw new Error("Test daemon did not expose a bound TCP listen target");
      }

      const close = async (): Promise<void> => {
        await daemon.stop().catch(() => undefined);
        await daemon.agentManager.flush().catch(() => undefined);
        if (options.cleanup ?? true) {
          await new Promise((r) => setTimeout(r, 50));
          await removeDirs([remioHomeRoot, staticDir]);
        }
      };

      return {
        config,
        daemon,
        port: listenTarget.port,
        remioHome,
        staticDir,
        close,
      };
    } catch (error) {
      lastError = error;
      await daemon.stop().catch(() => undefined);
      // A failed attempt removes only what it created: a caller-supplied home keeps its serverId.
      await removeDirs(createdDirs);

      if (
        (!isAddressInUseError(error) && !isStartupTimeoutError(error)) ||
        attempt === maxAttempts - 1
      ) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Failed to start test daemon");
}

interface PreparedTestDaemonConfig {
  config: RemioDaemonConfig;
  remioHomeRoot: string;
  remioHome: string;
  staticDir: string;
  createdDirs: string[];
}

async function removeDirs(dirs: string[]): Promise<void> {
  await Promise.all(
    dirs.map((dir) => rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })),
  );
}

async function createTempDir(prefix: string, createdDirs: string[]): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  createdDirs.push(dir);
  return dir;
}

async function prepareTestDaemonConfig(
  options: TestRemioDaemonOptions,
): Promise<PreparedTestDaemonConfig> {
  const createdDirs: string[] = [];
  const remioHomeRoot = options.remioHomeRoot ?? (await createTempDir("remio-home-", createdDirs));
  const remioHome = path.join(remioHomeRoot, ".remio");
  await mkdir(remioHome, { recursive: true });
  const staticDir = options.staticDir ?? (await createTempDir("remio-static-", createdDirs));
  const listenHost = options.listen ?? "127.0.0.1";
  const listenPort = options.listenPort ?? 0;
  const config: RemioDaemonConfig = {
    listen: `${listenHost}:${listenPort}`,
    remioHome,
    daemonVersion: options.daemonVersion,
    desktopManaged: options.desktopManaged,
    corsAllowedOrigins: options.corsAllowedOrigins ?? [],
    hostnames: options.hostnames ?? true,
    mcpEnabled: options.mcpEnabled ?? true,
    staticDir,
    mcpDebug: options.mcpDebug ?? false,
    isDev: options.isDev,
    agentClients: options.agentClients ?? createTestAgentClients(),
    providerOverrides: options.providerOverrides,
    providerCatalogRefreshTimeoutMs: options.providerCatalogRefreshTimeoutMs,
    agentStoragePath: path.join(remioHome, "agents"),
    relayEnabled: options.relayEnabled ?? false,
    relayEndpoint: options.relayEndpoint ?? "relay.remio.hoshizukimio.moe:443",
    relayUseTls: options.relayUseTls,
    relayPublicUseTls: options.relayPublicUseTls,
    relayRequireProtectedSecurity: options.relayRequireProtectedSecurity,
    appBaseUrl: "https://app.remio.hoshizukimio.moe",
    auth: options.auth,
    pushNotificationSender: options.pushNotificationSender,
    serviceProxy: options.serviceProxy,
    webUi: options.webUi,
    trustedProxies: options.trustedProxies,
    openai: options.openai,
    speech: options.speech
      ? {
          ...options.speech,
          localModelsDir:
            options.speech.localModelsDir ??
            options.speech.local?.modelsDir ??
            path.join(remioHome, "models", "local-speech"),
        }
      : undefined,
    voiceLlmProvider: options.voiceLlmProvider ?? null,
    voiceLlmProviderExplicit: options.voiceLlmProviderExplicit ?? false,
    voiceLlmModel: options.voiceLlmModel ?? null,
    dictationFinalTimeoutMs: options.dictationFinalTimeoutMs,
    downloadTokenTtlMs: options.downloadTokenTtlMs,
    agentProfiles: options.agentProfiles,
    autoArchiveAfterMerge: options.autoArchiveAfterMerge,
    resumeOnStartup: options.resumeOnStartup,
    resumePrompt: options.resumePrompt,
    pluginsEnabled: options.pluginsEnabled,
    plugins: options.plugins,
    pluginRegistryUrl: options.pluginRegistryUrl,
  };
  return { config, remioHomeRoot, remioHome, staticDir, createdDirs };
}

function isAddressInUseError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { code?: string };
  return record.code === "EADDRINUSE";
}

function isStartupTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { code?: string };
  return record.code === "TEST_DAEMON_START_TIMEOUT";
}
