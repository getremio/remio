import { workspaceLabelKey } from "@getremio/protocol/workspace-labels";
export type { TerminalReplayEvent, TerminalStreamEvent } from "./terminal-stream-router.js";
import type { AgentAddress } from "@getremio/protocol/addresses";
import { parentAddressLabels } from "@getremio/protocol/agent-labels";
export type { AgentAddress } from "@getremio/protocol/addresses";
import { createHostActions, type RemioHostActions } from "./hosts/index.js";
export type { RemioHostActions } from "./hosts/index.js";
export type { HostAdd, HostUpdate, HostSummary, HostDirectory } from "@getremio/protocol/hosts";
import type { OwnedSubscription } from "./connection/index.js";
export type { OwnedSubscription, SubscriptionObserver } from "./connection/index.js";
import type { DaemonClientConfig } from "./daemon-client.js";
import type { AgentPermissionResponse, JsonValue } from "@getremio/protocol/agent-types";
import type {
  AgentSnapshotPayload,
  CreationSnapshot,
  CreateAgentRequestMessage,
  FetchWorkspacesRequestMessage,
  FetchWorkspacesResponseMessage,
  GetProvidersSnapshotResponseMessage,
  ListAvailableProvidersResponse,
  ListCommandsResponse,
  ListProviderFeaturesRequestMessage,
  ListProviderFeaturesResponseMessage,
  ProviderControlsListRequestMessage,
  ProviderControlsListResponseMessage,
  ListProviderModelsResponseMessage,
  ProjectListRequestMessage,
  ProjectListResponseMessage,
  ListProviderModesResponseMessage,
  MutableDaemonConfig,
  MutableDaemonConfigPatch,
  ProviderDiagnosticResponseMessage,
  ProviderUsageListResponseMessage,
  ProjectPlacementPayload,
  WorkspaceProjectDescriptorPayload,
  RefreshProvidersSnapshotResponseMessage,
  SessionOutboundMessage,
  WorkspaceDescriptorPayload,
  WorkspaceCreateRequest,
} from "@getremio/protocol/messages";
import { DaemonClient, type CreateAgentRequestOptions } from "./daemon-client.js";
import {
  createTerminalActions,
  type RemioTerminalActions,
  type RemioWorkspaceTerminalActions,
} from "./terminals/index.js";
export type {
  RemioTerminal,
  RemioTerminalActions,
  RemioTerminalHandle,
  RemioTerminalCreateOptions,
  RemioTerminalListOptions,
  RemioTerminalListResult,
  RemioTerminalCaptureOptions,
  RemioTerminalCaptureResult,
  RemioWorkspaceTerminalActions,
} from "./terminals/index.js";
import type { PluginTimelineItem } from "@getremio/protocol/agent-types";
import type {
  AgentBackgroundWorkItem,
  FetchAgentsEntry,
  FetchAgentsOptions,
  FetchAgentsPageInfo,
  FetchAgentTimelineCursor,
  FetchAgentTimelineDirection,
  FetchAgentTimelinePayload,
  FetchAgentTimelineProjection,
  SendMessageOptions,
  WaitForFinishResult,
} from "./daemon-client.js";

/**
 * Coding turns routinely run for minutes, so the handle waits far longer than
 * the transport's own conservative default.
 */
const DEFAULT_WAIT_FOR_FINISH_MS = 10 * 60_000;

export type ConnectionState =
  | { status: "idle" }
  | { status: "connecting"; attempt: number }
  | { status: "connected" }
  | { status: "disconnected"; reason?: string }
  | { status: "disposed" };

export interface RemioLogger {
  debug(obj: object, msg?: string): void;
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

export interface RemioClientConfig {
  capabilities?: DaemonClientConfig["capabilities"];
  url: string;
  clientId?: string;
  appVersion?: string;
  runtimeGeneration?: number | null;
  password?: string;
  authHeader?: string;
  suppressSendErrors?: boolean;
  logger?: RemioLogger;
  connectTimeoutMs?: number;
  e2ee?: {
    enabled?: boolean;
    daemonPublicKeyB64?: string;
  };
  reconnect?: {
    enabled?: boolean;
    baseDelayMs?: number;
    maxDelayMs?: number;
  };
  runtimeMetricsIntervalMs?: number;
  runtimeMetricsWindowMs?: number;
}

export type RemioWorkspace = WorkspaceDescriptorPayload;
export type RemioAgent = AgentSnapshotPayload;
export type RemioAgentListOptions = FetchAgentsOptions;
export type RemioProject = WorkspaceProjectDescriptorPayload;
export type RemioProjectListOptions = Omit<ProjectListRequestMessage, "type" | "requestId"> & {
  requestId?: string;
};
export type RemioProjectListResult = ProjectListResponseMessage["payload"];
export type RemioProjectUpdate = Extract<
  SessionOutboundMessage,
  { type: "project.update" }
>["payload"];
export type RemioProjectUpdateHandler = (update: RemioProjectUpdate) => void;

export interface RemioAgentListResult {
  subscription?: OwnedSubscription<RemioAgentListResult>;
  requestId: string;
  subscriptionId?: string | null;
  entries: FetchAgentsEntry[];
  pageInfo: FetchAgentsPageInfo;
}
export type RemioWorkspaceListOptions = Omit<
  FetchWorkspacesRequestMessage,
  "type" | "requestId"
> & {
  requestId?: string;
};

export interface RemioWorkspaceListResult {
  subscription?: OwnedSubscription<RemioWorkspaceListResult>;
  requestId: string;
  subscriptionId?: string | null;
  entries: RemioWorkspace[];
  pageInfo: FetchWorkspacesResponseMessage["payload"]["pageInfo"];
}

export interface RemioWorkspaceOpenOptions {
  cwd: string;
  requestId?: string;
}

export type RemioWorkspaceCreateOptions = Omit<
  WorkspaceCreateRequest,
  "type" | "requestId" | "agent" | "subscribe"
> & {
  requestId?: string;
  agent?: Omit<
    RemioAgentCreateOptions,
    "worktree" | "git" | "onEvent" | "idempotencyKey" | "requestId"
  >;
  onEvent?: (snapshot: CreationSnapshot) => void;
};

export interface RemioWorkspaceArchiveResult {
  requestId: string;
  workspaceId: string;
  archivedAt: string | null;
  error: string | null;
}

export type RemioWorkspaceUpdate = Extract<
  SessionOutboundMessage,
  { type: "workspace_update" }
>["payload"];

export type RemioWorkspaceUpdateHandler = (update: RemioWorkspaceUpdate) => void;

export interface RemioWorkspaceHandle {
  readonly id: string;
  readonly projectId: string | null;
  readonly directory: string | null;
  readonly name: string | null;
  readonly status: RemioWorkspace["status"] | null;
  /** Data plugins stored on the workspace. Remio never reads a key. */
  readonly metadata: NonNullable<RemioWorkspace["metadata"]> | null;
  readonly agents: {
    create(options: RemioWorkspaceAgentCreateOptions): Promise<RemioAgentHandle>;
  };
  readonly terminals: RemioWorkspaceTerminalActions;
  current(): RemioWorkspace | null;
  refresh(options?: { requestId?: string }): Promise<RemioWorkspace | null>;
  setTitle(title: string | null, requestId?: string): Promise<{ title: string | null }>;
  /** Top-level keys replace; `null` removes the key. Needs a host with `entityMetadata`. */
  setMetadata(patch: Record<string, JsonValue>): Promise<void>;
  setPinned(pinned: boolean): Promise<{ pinnedAt: string | null }>;
  setLabel(name: string, options: { assigned: boolean }): Promise<{ labels: string[] }>;
  setBaseBranch(options: {
    baseRef: string;
    requestId?: string;
  }): Promise<{ baseRef: string | null }>;
  archive(requestId?: string): Promise<RemioWorkspaceArchiveResult>;
  /**
   * Subscribes to already-emitted daemon workspace_update events for this id.
   * This returns a local unsubscribe function; it does not own app cache state or
   * send a daemon unsubscribe RPC. Call `workspaces.list({ subscribe: {} })` when
   * the daemon should start streaming workspace directory updates.
   */
  subscribe(handler: (update: RemioWorkspaceUpdate) => void): () => void;
}

export interface RemioProjectActions {
  list(options?: RemioProjectListOptions): Promise<RemioProjectListResult>;
  subscribe(handler: RemioProjectUpdateHandler): () => void;
}

export interface RemioWorkspaceActions {
  list(options: RemioWorkspaceListOptions & { subscribe: {} }): Promise<
    RemioWorkspaceListResult & {
      subscriptionId: string;
      subscription: OwnedSubscription<RemioWorkspaceListResult>;
    }
  >;
  list(options?: RemioWorkspaceListOptions): Promise<RemioWorkspaceListResult>;
  ref(workspace: string | RemioWorkspace): RemioWorkspaceHandle;
  open(
    input: string | RemioWorkspaceOpenOptions,
    requestId?: string,
  ): Promise<RemioWorkspaceHandle>;
  create(options: RemioWorkspaceCreateOptions): Promise<RemioWorkspaceHandle>;
  archive(
    workspace: string | RemioWorkspaceHandle,
    requestId?: string,
  ): Promise<RemioWorkspaceArchiveResult>;
  /**
   * Local event subscription over the low-level driver's workspace_update stream.
   * The returned function only removes this SDK listener.
   */
  subscribe(handler: RemioWorkspaceUpdateHandler): () => void;
}

type RemioAgentSessionConfig = CreateAgentRequestMessage["config"];
export type RemioAgentProvider = RemioAgentSessionConfig["provider"];

export type RemioProviderFeatureValues = Record<string, unknown>;

export interface RemioAgentConfig {
  /** Provider and model in `provider/model` format. */
  provider: string;
  modeId?: RemioAgentSessionConfig["modeId"];
  thinkingOptionId?: RemioAgentSessionConfig["thinkingOptionId"];
  /** @deprecated Put these in `options`; they are folded into it on send. */
  featureValues?: RemioProviderFeatureValues;
  /**
   * JSON-safe provider settings, validated by the selected provider. They include the settings the
   * provider offers a composer control for, such as `service_tier` or `fast_mode`.
   */
  options?: RemioAgentSessionConfig["providerOptions"];
  systemPrompt?: RemioAgentSessionConfig["systemPrompt"];
  toolPolicy?: RemioAgentSessionConfig["toolPolicy"];
  mcpServers?: RemioAgentSessionConfig["mcpServers"];
}

export interface RemioAgentCreateOptions {
  idempotencyKey?: string;
  agentId?: string;
  onEvent?: (snapshot: CreationSnapshot) => void;
  config: RemioAgentConfig;
  cwd: string;
  parent?: string | AgentAddress | RemioAgentHandle;
  title?: RemioAgentSessionConfig["title"];
  env?: CreateAgentRequestMessage["env"];
  prompt?: string;
  clientMessageId?: string;
  outputSchema?: Record<string, unknown>;
  images?: CreateAgentRequestMessage["images"];
  attachments?: CreateAgentRequestMessage["attachments"];
  git?: CreateAgentRequestMessage["git"];
  worktree?: CreateAgentRequestMessage["worktree"];
  autoArchive?: CreateAgentRequestMessage["autoArchive"];
  /**
   * Creates a background agent: hidden from default lists, tabs, the parent's subagent track
   * and notifications, and still addressable by id. A workspace this call creates is
   * background too. With a parent and no value, the parent's own background applies.
   */
  background?: CreateAgentRequestMessage["background"];
  requestId?: string;
  labels?: Record<string, string>;
  /** Data plugins store on the agent: JSON values under keys such as `"linear.issue"`. */
  metadata?: CreateAgentRequestMessage["metadata"];
}

export type RemioWorkspaceAgentCreateOptions = Omit<RemioAgentCreateOptions, "cwd">;

export interface RemioAgentRefetchResult {
  agent: RemioAgent;
  project: ProjectPlacementPayload | null;
}

export interface RemioAgentTimelineRefetchOptions {
  direction?: FetchAgentTimelineDirection;
  cursor?: FetchAgentTimelineCursor;
  limit?: number;
  projection?: FetchAgentTimelineProjection;
  /**
   * Extends a `tail` or `before` page back to the start of the oldest turn it touches, so
   * `{ direction: "tail", limit: 1, wholeTurns: true }` returns the latest turn.
   */
  wholeTurns?: boolean;
  requestId?: string;
}

export type RemioAgentSendOptions = SendMessageOptions;

export interface RemioAgentRunOptions extends RemioAgentSendOptions {
  timeoutMs?: number;
}

export type RemioAgentRunResult = WaitForFinishResult;
export type RemioAgentPermissionResponse = AgentPermissionResponse;

export interface RemioAgentRespondToPermissionOptions {
  requestId: string;
  response: RemioAgentPermissionResponse;
}

export interface RemioAgentCommandsOptions {
  requestId?: string;
}

export type RemioAgentCommandsResult = ListCommandsResponse["payload"];

export type RemioAgentUpdate = Extract<SessionOutboundMessage, { type: "agent_update" }>["payload"];

export type RemioAgentStream = Extract<SessionOutboundMessage, { type: "agent_stream" }>["payload"];

export type RemioAgentUpdateHandler = (update: RemioAgentUpdate) => void;

export type RemioAgentTimelineEvent =
  | RemioAgentStream
  | {
      agentId: string;
      event: { type: "replacement"; epoch: string };
    }
  | {
      agentId: string;
      subscriptionId: string;
      event: { type: "subscription_restored" };
    }
  | { agentId: string; event: { type: "error"; error: string } };

export type RemioAgentTimelineSubscription = ReturnType<DaemonClient["subscribeAgentTimeline"]>;

export interface RemioAgentTimelineHandle {
  append(item: Omit<PluginTimelineItem, "pluginId">): Promise<{ seq: number; epoch: string }>;
  /**
   * Fetches a fresh timeline page through the existing daemon RPC. If the daemon
   * includes an agent snapshot in the response, the parent handle is updated to
   * that value.
   */
  refetch(options?: RemioAgentTimelineRefetchOptions): Promise<FetchAgentTimelinePayload>;
  /**
   * Delivers live events only. After reconnect, subscription_restored precedes
   * subsequent updates. History may have been missed; use refetch() to request
   * the range you need. No history is fetched automatically. A replacement event
   * invalidates the previous epoch. Subscription errors release this observation.
   * Await the returned unsubscribe function's `ready` promise before starting
   * work that must be observed. It rejects if establishment fails.
   */
  subscribe(handler: (event: RemioAgentTimelineEvent) => void): RemioAgentTimelineSubscription;
}

export type RemioAgentBackgroundWorkItem = AgentBackgroundWorkItem;

export interface RemioAgentBackgroundWorkHandle {
  /** Stop one item and wait for provider confirmation. */
  stop(
    item: RemioAgentBackgroundWorkItem,
    options?: { requestId?: string; timeout?: number },
  ): Promise<void>;
  /** Reads the agent's current background work once. */
  list(options?: { requestId?: string; timeout?: number }): Promise<RemioAgentBackgroundWorkItem[]>;
  /**
   * Calls `listener` with the agent's current list once the subscription is established, again
   * after each reconnect, then with the full list each time it changes. Returns the unsubscribe
   * function.
   *
   * When reading the current list fails, `options.onError` receives the error and `listener` is
   * not called; without `onError` the error is logged. The read is not retried: the next
   * reconnect reads the list again.
   */
  subscribe(
    listener: (items: RemioAgentBackgroundWorkItem[]) => void,
    options?: RemioAgentBackgroundWorkSubscribeOptions,
  ): () => void;
}

export interface RemioAgentBackgroundWorkSubscribeOptions {
  /** Receives the error when reading the agent's current list fails. */
  onError?: (error: unknown) => void;
}

export interface RemioAgentHandle {
  readonly id: string;
  readonly address: AgentAddress;
  /**
   * `workspaceId` through `archivedAt` mirror the last snapshot this handle
   * observed. A handle from `ref()` reads `null` for all of them until
   * `refresh()`, `run()`, `waitForFinish()`, a timeline refetch, or
   * `subscribe()` delivers a snapshot. Optional snapshot values also read as
   * `null`; use `current()` when you need to distinguish those states.
   */
  readonly workspaceId: string | null;
  readonly cwd: string | null;
  readonly status: RemioAgent["status"] | null;
  readonly capabilities: RemioAgent["capabilities"] | null;
  readonly availableModes: RemioAgent["availableModes"] | null;
  readonly pendingPermissions: RemioAgent["pendingPermissions"] | null;
  readonly activeTurn: NonNullable<RemioAgent["activeTurn"]> | null;
  readonly lastUsage: NonNullable<RemioAgent["lastUsage"]> | null;
  readonly lastError: NonNullable<RemioAgent["lastError"]> | null;
  /** @deprecated Use `controls` and `options`. */
  readonly features: NonNullable<RemioAgent["features"]> | null;
  /** The provider options the agent runs with: `config.json` defaults merged with its own. */
  readonly options: NonNullable<RemioAgent["options"]> | null;
  /** How the provider wants its options drawn. Controls hold no value; read `options`. */
  readonly controls: NonNullable<RemioAgent["controls"]> | null;
  /** Data plugins stored on the agent. Remio never reads a key. */
  readonly metadata: NonNullable<RemioAgent["metadata"]> | null;
  readonly runtimeInfo: NonNullable<RemioAgent["runtimeInfo"]> | null;
  readonly archivedAt: NonNullable<RemioAgent["archivedAt"]> | null;
  readonly timeline: RemioAgentTimelineHandle;
  readonly backgroundWork: RemioAgentBackgroundWorkHandle;
  current(): RemioAgent | null;
  refresh(requestId?: string): Promise<RemioAgentRefetchResult | null>;
  /**
   * Reopens the provider session with current configuration, rerunning session-open hooks.
   * Interrupts a running turn and returns the refreshed snapshot.
   */
  reload(options?: { requestId?: string }): Promise<RemioAgentRefetchResult | null>;
  send(text: string, options?: RemioAgentSendOptions): Promise<void>;
  respondToPermission(options: RemioAgentRespondToPermissionOptions): Promise<void>;
  /**
   * Changes the agent's own options: top-level keys replace, `null` removes the key so the
   * `config.json` default (or the provider's own default) applies again. Resolves once the
   * provider has applied the patch; a provider that cannot apply a key live rejects it.
   */
  setOptions(patch: Record<string, unknown>): Promise<void>;
  /** Top-level keys replace; `null` removes the key. Needs a host with `entityMetadata`. */
  setMetadata(patch: Record<string, JsonValue>): Promise<void>;
  /** Sends a prompt and resolves when that turn finishes or needs attention. */
  run(text: string, options?: RemioAgentRunOptions): Promise<RemioAgentRunResult>;
  /** Waits for the current turn, including one started with `prompt`. */
  waitForFinish(timeoutMs?: number): Promise<RemioAgentRunResult>;
  /**
   * Asks the running session for the slash commands and skills it actually
   * loaded. Providers answer from the live session, so this sees built-in and
   * bundled entries that no directory scan can find. The payload carries its own
   * `error` string; a provider that cannot answer reports it there rather than
   * rejecting.
   */
  commands(options?: RemioAgentCommandsOptions): Promise<RemioAgentCommandsResult>;
  archive(): Promise<{ archivedAt: string }>;
  detach(): Promise<void>;
  subscribe(handler: (update: RemioAgentUpdate) => void): () => void;
}

export interface RemioAgentActions {
  list(options: RemioAgentListOptions & { subscribe: {} }): Promise<
    RemioAgentListResult & {
      subscriptionId: string;
      subscription: OwnedSubscription<RemioAgentListResult>;
    }
  >;
  list(options?: RemioAgentListOptions): Promise<RemioAgentListResult>;
  ref(agent: string | RemioAgent): RemioAgentHandle;
  create(options: RemioAgentCreateOptions): Promise<RemioAgentHandle>;
  /**
   * Local event subscription over the low-level driver's agent_update stream.
   * The returned function only removes this SDK listener.
   */
  subscribe(handler: RemioAgentUpdateHandler): () => void;
}

export type RemioProviderModelsResult = ListProviderModelsResponseMessage["payload"];
export type RemioProviderModesResult = ListProviderModesResponseMessage["payload"];
type RemioProviderControlsDraft = ProviderControlsListRequestMessage["draftConfig"];
export interface RemioProviderControlsInput extends Omit<
  RemioProviderControlsDraft,
  "provider" | "model"
> {
  /** Provider and model in `provider/model` format. */
  provider: string;
}
export type RemioProviderControlsResult = ProviderControlsListResponseMessage["payload"];
/** @deprecated Use `RemioProviderControlsInput`. */
export type RemioProviderFeaturesInput = Omit<
  ListProviderFeaturesRequestMessage["draftConfig"],
  "provider" | "model"
> & { provider: string };
/** @deprecated Use `RemioProviderControlsResult`. */
export type RemioProviderFeaturesResult = ListProviderFeaturesResponseMessage["payload"];
export type RemioProviderAvailabilityResult = ListAvailableProvidersResponse["payload"];
export type RemioProviderSnapshotResult = GetProvidersSnapshotResponseMessage["payload"];
export type RemioProviderSnapshotUpdate = Extract<
  SessionOutboundMessage,
  { type: "providers_snapshot_update" }
>["payload"];
export type RemioProviderRefreshResult = RefreshProvidersSnapshotResponseMessage["payload"];
export type RemioProviderDiagnosticResult = ProviderDiagnosticResponseMessage["payload"];
export type RemioProviderUsageResult = ProviderUsageListResponseMessage["payload"];
export interface RemioProviderUsageOptions {
  requestId?: string;
}

export interface RemioProviderListOptions {
  cwd?: string;
  requestId?: string;
}

export interface RemioProviderRefreshOptions {
  cwd?: string;
  providers?: RemioAgentProvider[];
  requestId?: string;
}

export interface RemioProviderWaitOptions extends RemioProviderListOptions {
  timeoutMs?: number;
}

export interface RemioProviderActions {
  listModels(
    provider: RemioAgentProvider,
    options?: RemioProviderListOptions,
  ): Promise<RemioProviderModelsResult>;
  listModes(
    provider: RemioAgentProvider,
    options?: RemioProviderListOptions,
  ): Promise<RemioProviderModesResult>;
  /**
   * The controls a draft agent would show and the options it would run with, resolved by the
   * daemon from `config.json` defaults and the draft's own `providerOptions`.
   */
  listControls(
    draftConfig: RemioProviderControlsInput,
    options?: { requestId?: string },
  ): Promise<RemioProviderControlsResult>;
  /** @deprecated Use `listControls`. */
  listFeatures(
    draftConfig: RemioProviderFeaturesInput,
    options?: { requestId?: string },
  ): Promise<RemioProviderFeaturesResult>;
  listAvailable(options?: { requestId?: string }): Promise<RemioProviderAvailabilityResult>;
  snapshot(options?: RemioProviderListOptions): Promise<RemioProviderSnapshotResult>;
  /** Resolves after the daemon's lazy provider discovery has finished. */
  waitForReady(options?: RemioProviderWaitOptions): Promise<RemioProviderSnapshotResult>;
  refresh(options?: RemioProviderRefreshOptions): Promise<RemioProviderRefreshResult>;
  diagnostic(
    provider: RemioAgentProvider,
    options?: { requestId?: string },
  ): Promise<RemioProviderDiagnosticResult>;
  listUsage(options?: RemioProviderUsageOptions): Promise<RemioProviderUsageResult>;
  subscribe(handler: (update: RemioProviderSnapshotUpdate) => void): () => void;
}

export interface RemioConfigActions {
  /**
   * Reads daemon config through the existing config RPC. Provider profiles,
   * custom provider entries, keys/env, custom binaries, and provider enablement
   * are currently config-file-shaped daemon state, so the SDK exposes this raw
   * typed surface instead of pretending there are higher-level provider-settings
   * RPCs.
   */
  get(requestId?: string): Promise<{ requestId: string; config: MutableDaemonConfig }>;
  /**
   * Patches daemon config through the existing config RPC. The daemon validates
   * and persists supported fields; unsupported provider/settings workflows remain
   * daemon gaps until first-class RPCs exist.
   */
  patch(
    config: MutableDaemonConfigPatch,
    requestId?: string,
  ): Promise<{ requestId: string; config: MutableDaemonConfig }>;
}

export interface RemioApi {
  readonly hosts: RemioHostActions;
  dispose(): Promise<void>;
  observeEvents: DaemonClient["observeEvents"];
  readonly terminals: RemioTerminalActions;
  readonly workspaces: RemioWorkspaceActions;
  readonly projects: RemioProjectActions;
  readonly agents: RemioAgentActions;
  readonly providers: RemioProviderActions;
  readonly config: RemioConfigActions;
}

export interface RemioClient extends RemioApi {
  connect(): Promise<void>;
  close(): Promise<void>;
  ensureConnected(): void;
  getConnectionState(): ConnectionState;
}

export function createRemioClient(config: RemioClientConfig): RemioClient {
  const daemonClient = new DaemonClient({
    ...config,
    clientId: config.clientId ?? createGeneratedClientId(),
    clientType: "cli",
  });
  const api = createRemioApi(daemonClient);
  return {
    ...api,
    connect: () => daemonClient.connect(),
    close: async () => {
      try {
        await api.dispose();
      } finally {
        await daemonClient.close();
      }
    },
    ensureConnected: () => daemonClient.ensureConnected(),
    getConnectionState: () => daemonClient.getConnectionState(),
  };
}

function toDaemonAgentCreateOptions(
  options: RemioAgentCreateOptions,
  placement?: { workspaceId: string; cwd: string },
  serverId?: string,
): CreateAgentRequestOptions {
  const { config: agentConfig, cwd, parent, title, prompt, ...requestOptions } = options;
  const {
    provider: providerModel,
    options: ownOptions,
    featureValues,
    ...runtimeConfig
  } = agentConfig;
  // COMPAT(featureValues): added in v0.15.0, remove after 2027-05-01. An explicit option wins.
  const providerOptions = featureValues ? { ...featureValues, ...ownOptions } : ownOptions;
  const { provider, model } = parseProviderModel(providerModel);
  const relationship = parent ? encodeParent(parent, serverId) : {};
  return {
    ...requestOptions,
    config: {
      ...runtimeConfig,
      provider,
      model,
      cwd: placement?.cwd ?? cwd,
      ...(title !== undefined ? { title } : {}),
      ...(providerOptions !== undefined ? { providerOptions } : {}),
    },
    ...(placement ? { workspaceId: placement.workspaceId } : {}),
    ...(parent
      ? {
          ...relationship,
          labels: { ...requestOptions.labels, ...relationship.labels },
        }
      : {}),
    ...(prompt !== undefined ? { initialPrompt: prompt } : {}),
  };
}

export function createRemioApi(
  daemonClient: DaemonClient,
  scopeOptions?: { signal?: AbortSignal },
): RemioApi {
  const handles = new Set<{ release(): Promise<void> }>();
  const agentListeners = new Set<RemioAgentUpdateHandler>();
  const workspaceListeners = new Set<RemioWorkspaceUpdateHandler>();
  const lifetime = new AbortController();
  const own = <T extends { release(): Promise<void> }>(create: () => T): T => {
    if (lifetime.signal.aborted) throw new Error("Remio API is disposed");
    const handle = create();
    handles.add(handle);
    const release = handle.release.bind(handle);
    handle.release = async () => {
      await release();
      handles.delete(handle);
    };
    return handle;
  };
  const listenAgents = (handler: RemioAgentUpdateHandler) => {
    if (lifetime.signal.aborted) throw new Error("Remio API is disposed");
    agentListeners.add(handler);
    return () => {
      agentListeners.delete(handler);
    };
  };
  const listenWorkspaces = (handler: RemioWorkspaceUpdateHandler) => {
    if (lifetime.signal.aborted) throw new Error("Remio API is disposed");
    workspaceListeners.add(handler);
    return () => {
      workspaceListeners.delete(handler);
    };
  };
  const createAgentHandle = createAgentHandleFactory(
    daemonClient,
    listenAgents,
    (agentId, handler) => own(() => daemonClient.subscribeAgentTimeline(agentId, handler)),
    () => own(() => daemonClient.observeAgentBackgroundWork()),
  );
  const createAgent = async (
    options: RemioAgentCreateOptions,
    placement?: { workspaceId: string; cwd: string },
  ) => {
    const serverId = daemonClient.getLastServerInfoMessage()?.serverId;
    const foreignParent =
      options.background === undefined ? foreignParentHandle(options.parent, serverId) : null;
    const resolved = foreignParent
      ? await inheritParentBackground(options, foreignParent)
      : options;
    const agent = await daemonClient.createAgent(
      toDaemonAgentCreateOptions(resolved, placement, serverId),
    );
    return createAgentHandle(agent);
  };
  const terminals = createTerminalActions(daemonClient, async (workspaceId) => {
    const workspace = await createWorkspaceHandle(workspaceId).refresh();
    if (!workspace?.workspaceDirectory) {
      throw new Error(`Workspace ${workspaceId} is not active or has no available directory`);
    }
    return workspace.workspaceDirectory;
  });
  const createWorkspaceHandle = createWorkspaceHandleFactory(
    daemonClient,
    createAgent,
    terminals,
    listenWorkspaces,
  );

  let disposal: Promise<void> | null = null;
  const dispose = (): Promise<void> => {
    if (disposal) return disposal;
    lifetime.abort();
    scopeOptions?.signal?.removeEventListener("abort", abort);
    agentListeners.clear();
    workspaceListeners.clear();
    disposal = Promise.allSettled([...handles].map((handle) => handle.release())).then(
      (results) => {
        handles.clear();
        const failures = results.flatMap((result) =>
          result.status === "rejected" ? [result.reason] : [],
        );
        if (failures.length)
          throw new AggregateError(failures, "Failed to release API subscriptions");
        return undefined;
      },
    );
    return disposal;
  };
  const abort = () => {
    void dispose().catch((error) => console.error("API subscription cleanup failed", error));
  };
  if (scopeOptions?.signal?.aborted) abort();
  else scopeOptions?.signal?.addEventListener("abort", abort, { once: true });

  const observeEvents: DaemonClient["observeEvents"] = (events, options) =>
    own(() => daemonClient.observeEvents(events, options));

  const subscribeEvent = (
    event: "project.update" | "providers_snapshot_update",
    update: (message: SessionOutboundMessage) => void,
  ): (() => void) => {
    const observation = observeEvents([event]);
    observation.subscribe({ snapshot: () => {}, update });
    return () => {
      void observation
        .release()
        .catch((error) => console.error("Event subscription cleanup failed", error));
    };
  };

  function listWorkspaces(options: RemioWorkspaceListOptions & { subscribe: {} }): Promise<
    RemioWorkspaceListResult & {
      subscriptionId: string;
      subscription: OwnedSubscription<RemioWorkspaceListResult>;
    }
  >;
  function listWorkspaces(options?: RemioWorkspaceListOptions): Promise<RemioWorkspaceListResult>;
  async function listWorkspaces(
    options?: RemioWorkspaceListOptions,
  ): Promise<RemioWorkspaceListResult> {
    if (!options?.subscribe) return daemonClient.fetchWorkspaces(options);
    if (options.subscribe.subscriptionId !== undefined)
      throw new Error("Subscription IDs are assigned by the host");
    const subscription = own(() => daemonClient.observeWorkspaces(options));
    subscription.subscribe({
      snapshot: () => {},
      update: (message) => {
        if (message.type === "workspace_update")
          for (const listener of workspaceListeners) listener(message.payload);
      },
    });
    return { ...(await subscription.ready), subscription };
  }

  function listAgents(options: RemioAgentListOptions & { subscribe: {} }): Promise<
    RemioAgentListResult & {
      subscriptionId: string;
      subscription: OwnedSubscription<RemioAgentListResult>;
    }
  >;
  function listAgents(options?: RemioAgentListOptions): Promise<RemioAgentListResult>;
  async function listAgents(options?: RemioAgentListOptions): Promise<RemioAgentListResult> {
    if (!options?.subscribe) return daemonClient.fetchAgents(options);
    if (options.subscribe.subscriptionId !== undefined)
      throw new Error("Subscription IDs are assigned by the host");
    const subscription = own(() => daemonClient.observeAgents(options));
    subscription.subscribe({
      snapshot: () => {},
      update: (message) => {
        if (message.type === "agent_update")
          for (const listener of agentListeners) listener(message.payload);
      },
    });
    return { ...(await subscription.ready), subscription };
  }

  return {
    dispose,
    hosts: createHostActions(daemonClient, { own, signal: lifetime.signal, api: createRemioApi }),
    observeEvents,
    terminals,
    projects: {
      list: (options) => daemonClient.listProjects(options),
      subscribe: (handler) => {
        return subscribeEvent("project.update", (message) => {
          if (message.type === "project.update") handler(message.payload);
        });
      },
    },
    workspaces: {
      list: listWorkspaces,
      ref: (workspace) => createWorkspaceHandle(workspace),
      open: (input, requestId) =>
        openWorkspace(daemonClient, createWorkspaceHandle, input, requestId),
      create: async ({ requestId, agent, ...options }) => {
        const result = await daemonClient.createWorkspace(
          {
            ...options,
            ...(agent
              ? {
                  agent: toDaemonAgentCreateOptions(
                    agent,
                    undefined,
                    daemonClient.getLastServerInfoMessage()?.serverId,
                  ),
                }
              : {}),
          },
          requestId,
        );
        if (result.error || !result.workspace) {
          throw new Error(result.error ?? "The daemon did not create a workspace");
        }
        return createWorkspaceHandle(result.workspace);
      },
      archive: (workspace, requestId) =>
        daemonClient.archiveWorkspace(resolveWorkspaceId(workspace), requestId),
      subscribe: listenWorkspaces,
    },
    agents: {
      list: listAgents,
      ref: (agent) => createAgentHandle(agent),
      create: (options) => createAgent(options),
      subscribe: listenAgents,
    },
    providers: {
      listModels: (provider, options) => daemonClient.listProviderModels(provider, options),
      listModes: (provider, options) => daemonClient.listProviderModes(provider, options),
      listFeatures: ({ provider: providerModel, ...draftConfig }, options) => {
        const { provider, model } = parseProviderModel(providerModel);
        return daemonClient.listProviderFeatures({ ...draftConfig, provider, model }, options);
      },
      listControls: ({ provider: providerModel, ...draftConfig }, options) => {
        const { provider, model } = parseProviderModel(providerModel);
        return daemonClient.listProviderControls({ ...draftConfig, provider, model }, options);
      },
      listAvailable: (options) => daemonClient.listAvailableProviders(options),
      snapshot: (options) => daemonClient.getProvidersSnapshot(options),
      waitForReady: (options) =>
        waitForProvidersReady(
          daemonClient,
          observeEvents(["providers_snapshot_update"]),
          lifetime.signal,
          options,
        ),
      refresh: (options) => daemonClient.refreshProvidersSnapshot(options),
      diagnostic: (provider, options) => daemonClient.getProviderDiagnostic(provider, options),
      listUsage: (options) => listProviderUsage(daemonClient, options),
      subscribe: (handler) => {
        return subscribeEvent("providers_snapshot_update", (message) => {
          if (message.type === "providers_snapshot_update") handler(message.payload);
        });
      },
    },
    config: {
      get: (requestId) => daemonClient.getDaemonConfig(requestId),
      patch: (patch, requestId) => daemonClient.patchDaemonConfig(patch, requestId),
    },
  };
}

type WorkspaceHandleFactory = (workspace: string | RemioWorkspace) => RemioWorkspaceHandle;
type AgentHandleFactory = (agent: string | RemioAgent) => RemioAgentHandle;
type CreateAgent = (
  options: RemioAgentCreateOptions,
  placement?: { workspaceId: string; cwd: string },
) => Promise<RemioAgentHandle>;

function createWorkspaceHandleFactory(
  daemonClient: DaemonClient,
  createAgent: CreateAgent,
  terminals: RemioTerminalActions,
  listen: (handler: RemioWorkspaceUpdateHandler) => () => void,
): WorkspaceHandleFactory {
  return (workspace) => {
    const id = typeof workspace === "string" ? workspace : workspace.id;
    let current = typeof workspace === "string" ? null : workspace;

    const refresh = async (options?: { requestId?: string }) => {
      current = await daemonClient.findWorkspace(id, options);
      return current;
    };

    return {
      id,
      get projectId() {
        return current?.projectId ?? null;
      },
      get directory() {
        return current?.workspaceDirectory ?? null;
      },
      get name() {
        return current?.name ?? null;
      },
      get status() {
        return current?.status ?? null;
      },
      get metadata() {
        return current?.metadata ?? null;
      },
      agents: {
        create: async (options) => {
          const snapshot = current ?? (await refresh());
          if (!snapshot?.workspaceDirectory) {
            throw new Error(`Workspace ${id} has no available directory`);
          }
          return createAgent(
            { ...options, cwd: snapshot.workspaceDirectory },
            { workspaceId: id, cwd: snapshot.workspaceDirectory },
          );
        },
      },
      terminals: {
        create: (options) => terminals.create({ ...options, workspaceId: id }),
        list: (options) => terminals.list({ ...options, workspaceId: id }),
      },
      current: () => current,
      refresh,
      setTitle: (title, requestId) => daemonClient.setWorkspaceTitle(id, title, requestId),
      setMetadata: async (patch) => {
        const metadata = await daemonClient.setWorkspaceMetadata(id, patch);
        if (current) current = { ...current, metadata };
      },
      setPinned: (pinned) => daemonClient.setWorkspacePinned(id, pinned),
      setLabel: (name, options) =>
        assignWorkspaceLabel({
          client: daemonClient,
          workspaceId: id,
          name,
          assigned: options.assigned,
        }),
      setBaseBranch: (options) =>
        daemonClient.setWorkspaceBaseBranch({ ...options, workspaceId: id }),
      archive: async (requestId) => {
        const result = await daemonClient.archiveWorkspace(id, requestId);
        if (current) {
          current = { ...current, archivingAt: result.archivedAt };
        }
        return result;
      },
      subscribe: (handler) =>
        listen((update) => {
          if (update.kind === "upsert" && update.workspace.id === id) {
            current = update.workspace;
            handler(update);
          }
          if (update.kind === "remove" && update.id === id) {
            handler(update);
          }
        }),
    };
  };
}

function createAgentHandleFactory(
  daemonClient: DaemonClient,
  listen: (handler: RemioAgentUpdateHandler) => () => void,
  subscribeTimeline: DaemonClient["subscribeAgentTimeline"],
  observeBackgroundWork: () => ReturnType<DaemonClient["observeAgentBackgroundWork"]>,
): AgentHandleFactory {
  return (agent) => {
    const id = typeof agent === "string" ? agent : agent.id;
    let current = typeof agent === "string" ? null : agent;

    let serverId = daemonClient.getLastServerInfoMessage()?.serverId;
    const handle: RemioAgentHandle = {
      id,
      get address() {
        serverId ??= daemonClient.getLastServerInfoMessage()?.serverId;
        if (!serverId) throw new Error("Connect to a host before obtaining an agent address");
        return { serverId, agentId: id };
      },
      timeline: {
        append: (item) => daemonClient.appendAgentTimelineItem(id, item),
        refetch: async (options) => {
          const result = await daemonClient.fetchAgentTimeline(id, options);
          if (result.agent) {
            current = result.agent;
          }
          return result;
        },
        subscribe: (handler) =>
          subscribeTimeline(id, (message) => {
            switch (message.type) {
              case "agent_stream":
                return handler(message.payload);
              case "agent.timeline.subscription_restored":
                return handler({
                  agentId: id,
                  subscriptionId: message.payload.subscriptionId,
                  event: { type: "subscription_restored" },
                });
              case "agent.timeline.error":
                return handler({
                  agentId: id,
                  event: { type: "error", error: message.payload.error },
                });
              case "agent.timeline.replacement":
                return handler({
                  agentId: id,
                  event: { type: "replacement", epoch: message.payload.epoch },
                });
            }
          }),
      },
      backgroundWork: {
        stop: (item, options) => daemonClient.stopAgentBackgroundWork(id, item, options),
        list: (options) => daemonClient.listAgentBackgroundWork(id, options),
        subscribe: (listener, options) => {
          const observation = observeBackgroundWork();
          // Bumped by every delivery so a list answered after a newer update is dropped.
          let sequence = 0;
          let released = false;
          const reportError = (error: unknown) => {
            if (released) return;
            if (options?.onError) options.onError(error);
            else console.error("Background work subscription failed", error);
          };
          observation.subscribe({
            error: reportError,
            snapshot: () => {
              const listed = ++sequence;
              void daemonClient
                .listAgentBackgroundWork(id)
                .then((items) => {
                  if (!released && listed === sequence) listener(items);
                  return undefined;
                })
                .catch(reportError);
            },
            update: (message) => {
              if (message.type !== "agent.background_work.update") return;
              if (message.payload.agentId !== id) return;
              sequence++;
              listener(message.payload.items);
            },
          });
          return () => {
            released = true;
            void observation
              .release()
              .catch((error) =>
                console.error("Background work subscription cleanup failed", error),
              );
          };
        },
      },
      get workspaceId() {
        return current?.workspaceId ?? null;
      },
      get cwd() {
        return current?.cwd ?? null;
      },
      get status() {
        return current?.status ?? null;
      },
      get capabilities() {
        return current?.capabilities ?? null;
      },
      get availableModes() {
        return current?.availableModes ?? null;
      },
      get pendingPermissions() {
        return current?.pendingPermissions ?? null;
      },
      get activeTurn() {
        return current?.activeTurn ?? null;
      },
      get lastUsage() {
        return current?.lastUsage ?? null;
      },
      get lastError() {
        return current?.lastError ?? null;
      },
      get features() {
        return current?.features ?? null;
      },
      get options() {
        return current?.options ?? null;
      },
      get controls() {
        return current?.controls ?? null;
      },
      get metadata() {
        return current?.metadata ?? null;
      },
      get runtimeInfo() {
        return current?.runtimeInfo ?? null;
      },
      get archivedAt() {
        return current?.archivedAt ?? null;
      },
      current: () => current,
      refresh: async (requestId) => {
        const result = await daemonClient.fetchAgent({ agentId: id, requestId });
        current = result?.agent ?? null;
        return result;
      },
      reload: async (options) => {
        await daemonClient.refreshAgent(id, options?.requestId);
        const result = await daemonClient.fetchAgent({ agentId: id });
        current = result?.agent ?? null;
        return result;
      },
      send: async (text, options) => {
        await daemonClient.sendAgentMessage(id, text, options);
      },
      setOptions: async (patch) => {
        await daemonClient.setAgentOptions(id, patch);
      },
      setMetadata: async (patch) => {
        const metadata = await daemonClient.setAgentMetadata(id, patch);
        if (current) current = { ...current, metadata };
      },
      respondToPermission: async ({ requestId, response }) => {
        await daemonClient.respondToPermission(id, requestId, response);
      },
      run: async (text, options) => {
        const { timeoutMs, ...sendOptions } = options ?? {};
        await daemonClient.sendAgentMessage(id, text, sendOptions);
        const result = await daemonClient.waitForFinish(
          id,
          timeoutMs ?? DEFAULT_WAIT_FOR_FINISH_MS,
        );
        if (result.final) {
          current = result.final;
        }
        return result;
      },
      waitForFinish: async (timeoutMs) => {
        const result = await daemonClient.waitForFinish(
          id,
          timeoutMs ?? DEFAULT_WAIT_FOR_FINISH_MS,
        );
        if (result.final) {
          current = result.final;
        }
        return result;
      },
      commands: (options) => daemonClient.listCommands({ agentId: id, ...options }),
      archive: async () => {
        const result = await daemonClient.archiveAgent(id);
        if (current) {
          current = { ...current, archivedAt: result.archivedAt };
        }
        return result;
      },
      detach: async () => {
        await daemonClient.detachAgent(id);
      },
      subscribe: (handler) =>
        listen((update) => {
          if (update.kind === "upsert" && update.agent.id === id) {
            current = update.agent;
            handler(update);
          }
          if (update.kind === "remove" && update.agentId === id) {
            handler(update);
          }
        }),
    };

    return handle;
  };
}

async function openWorkspace(
  daemonClient: DaemonClient,
  createWorkspaceHandle: WorkspaceHandleFactory,
  input: string | RemioWorkspaceOpenOptions,
  requestId?: string,
): Promise<RemioWorkspaceHandle> {
  const options = typeof input === "string" ? { cwd: input, requestId } : input;
  const result = await daemonClient.openProject(options.cwd, options.requestId);
  if (result.error || !result.workspace) {
    throw new Error(result.error ?? `The daemon did not open a workspace for ${options.cwd}`);
  }
  return createWorkspaceHandle(result.workspace);
}

function resolveWorkspaceId(workspace: string | RemioWorkspaceHandle): string {
  return typeof workspace === "string" ? workspace : workspace.id;
}

function foreignParentHandle(
  parent: RemioAgentCreateOptions["parent"],
  serverId: string | undefined,
): RemioAgentHandle | null {
  if (!parent || typeof parent === "string" || !("address" in parent)) return null;
  return parent.address.serverId === serverId ? null : parent;
}

// A host inherits background from a caller it can see. A parent on another host is invisible to
// it, so a handle passes its own value on. A bare foreign address can't; pass background then.
async function inheritParentBackground(
  options: RemioAgentCreateOptions,
  parent: RemioAgentHandle,
): Promise<RemioAgentCreateOptions> {
  const snapshot = parent.current() ?? (await parent.refresh())?.agent;
  return snapshot?.background ? { ...options, background: true } : options;
}

function encodeParent(
  parent: string | AgentAddress | RemioAgentHandle,
  serverId?: string,
): Pick<CreateAgentRequestOptions, "callerAgentId" | "labels"> {
  if (typeof parent === "string") return { callerAgentId: parent };
  const address = "address" in parent ? parent.address : parent;
  if (!serverId) throw new Error("Connect to a host before creating a child");
  return address.serverId === serverId
    ? { callerAgentId: address.agentId, labels: parentAddressLabels(address) }
    : { labels: parentAddressLabels(address) };
}

function parseProviderModel(selection: string): { provider: string; model: string } {
  const separator = selection.indexOf("/");
  if (separator <= 0 || separator === selection.length - 1) {
    throw new Error('Expected config.provider in "provider/model" format');
  }
  return {
    provider: selection.slice(0, separator),
    model: selection.slice(separator + 1),
  };
}

function listProviderUsage(
  daemonClient: DaemonClient,
  options?: RemioProviderUsageOptions,
): Promise<RemioProviderUsageResult> {
  daemonClient.ensureConnected();
  // COMPAT(providerUsageList): added in v0.1.98, remove after 2027-02-28 once daemon floor >= v0.1.98.
  if (daemonClient.getLastServerInfoMessage()?.features?.providerUsageList !== true) {
    return Promise.reject(new Error("Update the host to list provider usage."));
  }
  return daemonClient.listProviderUsage(options);
}

async function waitForProvidersReady(
  daemonClient: DaemonClient,
  observation: ReturnType<DaemonClient["observeEvents"]>,
  signal: AbortSignal,
  options: RemioProviderWaitOptions = {},
): Promise<RemioProviderSnapshotResult> {
  const { timeoutMs = 60_000, ...snapshotOptions } = options;

  try {
    await observation.ready;
    if (signal.aborted) throw new Error("Remio API is disposed");
    return await new Promise<RemioProviderSnapshotResult>((resolve, reject) => {
      let settled = false;
      let requestId: string | null = null;
      let snapshotCwd: string | undefined;
      const pendingUpdates = new Map<string | undefined, RemioProviderSnapshotUpdate>();
      let latestEntries: RemioProviderSnapshotResult["entries"] = [];

      const cleanup = () => {
        clearTimeout(timeout);
        unsubscribe();
        signal.removeEventListener("abort", abort);
      };
      const finish = (snapshot: RemioProviderSnapshotResult) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(snapshot);
      };
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      };
      const updateMatches = (update: RemioProviderSnapshotUpdate) => update.cwd === snapshotCwd;

      const unsubscribe = observation.subscribe({
        snapshot: () => {},
        update: (message) => {
          if (message.type !== "providers_snapshot_update") return;
          const update = message.payload;
          if (!requestId) {
            pendingUpdates.set(update.cwd, update);
            return;
          }
          if (!updateMatches(update)) return;
          latestEntries = update.entries;
          if (update.entries.some((entry) => entry.status === "loading")) return;
          finish({ ...update, requestId });
        },
      });
      const abort = () => fail(new Error("Remio API is disposed"));
      signal.addEventListener("abort", abort, { once: true });

      const timeout = setTimeout(() => {
        const loading = latestEntries
          .filter((entry) => entry.status === "loading")
          .map((entry) => entry.provider)
          .join(", ");
        fail(
          new Error(
            loading
              ? `Timed out waiting for providers: ${loading}`
              : "Timed out waiting for provider discovery",
          ),
        );
      }, timeoutMs);

      void daemonClient
        .getProvidersSnapshot(snapshotOptions)
        .then((snapshot) => {
          requestId = snapshot.requestId;
          snapshotCwd = snapshot.cwd;
          latestEntries = snapshot.entries;
          if (!snapshot.entries.some((entry) => entry.status === "loading")) {
            finish(snapshot);
            return;
          }
          const pendingUpdate = pendingUpdates.get(snapshotCwd);
          if (pendingUpdate && !pendingUpdate.entries.some((entry) => entry.status === "loading")) {
            finish({ ...pendingUpdate, requestId });
          }
          return undefined;
        })
        .catch(fail);
    });
  } finally {
    await observation.release();
  }
}

function createGeneratedClientId(): string {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `remio-sdk-${randomId}`;
}

export type { DiffCompare, DiffState, DiffEntry, ResolvedShas } from "./diff/index.js";

interface WorkspaceLabelAssignment {
  client: DaemonClient;
  workspaceId: string;
  name: string;
  assigned: boolean;
}
async function assignWorkspaceLabel(
  input: WorkspaceLabelAssignment,
): Promise<{ labels: string[] }> {
  input.client.ensureConnected();
  // COMPAT(workspaceLabels): added in v0.5.0, remove gate after 2027-08-14.
  if (input.client.getLastServerInfoMessage()?.features?.workspaceLabels !== true)
    throw new Error("Update the host to assign workspace labels.");
  const catalog = await input.client.listWorkspaceLabels();
  const key = workspaceLabelKey(input.name);
  const existing = catalog.labels.find((label) => workspaceLabelKey(label.name) === key);
  const label = existing ?? { name: input.name, color: "violet" as const };
  const result = await input.client.setWorkspaceLabel({
    workspaceId: input.workspaceId,
    label,
    assigned: input.assigned,
  });
  return { labels: result.workspaceLabels };
}
