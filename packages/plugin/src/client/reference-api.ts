import type {
  RemioApi,
  RemioAgent,
  RemioAgentHandle,
  RemioWorkspace,
  RemioWorkspaceHandle,
  RemioWorkspaceCreateOptions,
} from "@getremio/client";
import type { RemioTerminal, RemioTerminalHandle } from "@getremio/client";
import type { PluginProjectSnapshot } from "../contracts.js";
import type { AgentRef, ProjectRef, TerminalRef, WorkspaceRef } from "../refs.js";
import type { PluginSidebarViewProps } from "./contracts.js";

export interface PluginProjectHandle {
  readonly ref: ProjectRef;
  open(): void;
  createWorkspace(
    input?: Omit<RemioWorkspaceCreateOptions, "source"> & {
      source?: RemioWorkspaceCreateOptions["source"];
    },
  ): Promise<RemioWorkspaceHandle>;
}
export interface PluginTerminalHandle extends RemioTerminalHandle {
  focus(): void;
}
export interface PluginRemioApi extends RemioApi {
  workspaces: Omit<RemioApi["workspaces"], "ref"> & {
    ref(workspace: string | RemioWorkspace | WorkspaceRef): RemioWorkspaceHandle;
  };
  agents: Omit<RemioApi["agents"], "ref"> & {
    ref(agent: string | RemioAgent | AgentRef): RemioAgentHandle;
  };
  projects: RemioApi["projects"] & { ref(project: ProjectRef): PluginProjectHandle };
  terminals: Omit<RemioApi["terminals"], "ref"> & {
    ref(terminal: TerminalRef): PluginTerminalHandle;
    ref(terminal: string | RemioTerminal): RemioTerminalHandle;
  };
}

/** Host adapter; the installation retains its single API identity across every surface. */
export function createPluginReferenceApi(input: {
  remio: RemioApi;
  resolveHost(hostId: string): RemioApi;
  readProject(ref: ProjectRef): PluginProjectSnapshot | null;
  navigation: PluginSidebarViewProps["navigation"];
}): PluginRemioApi {
  const { remio } = input;
  const workspaceRef = remio.workspaces.ref;
  const agentRef = remio.agents.ref;
  const terminalRef = remio.terminals.ref;
  function refWorkspace(workspace: string | RemioWorkspace | WorkspaceRef) {
    if (typeof workspace !== "string" && "hostId" in workspace)
      return input.resolveHost(workspace.hostId).workspaces.ref(workspace.id);
    return workspaceRef(workspace);
  }
  function refAgent(agent: string | RemioAgent | AgentRef) {
    if (typeof agent !== "string" && "hostId" in agent)
      return input.resolveHost(agent.hostId).agents.ref(agent.id);
    return agentRef(agent);
  }
  function terminal(ref: TerminalRef): PluginTerminalHandle;
  function terminal(ref: string | RemioTerminal): RemioTerminalHandle;
  function terminal(ref: TerminalRef | string | RemioTerminal): RemioTerminalHandle {
    if (typeof ref !== "string" && "hostId" in ref) {
      const handle = input.resolveHost(ref.hostId).terminals.ref(ref.id);
      return Object.assign(handle, { focus: () => input.navigation.openTerminal(ref) });
    }
    return terminalRef(ref);
  }
  function project(ref: ProjectRef): PluginProjectHandle {
    return {
      ref,
      open: () => input.navigation.openProject(ref),
      async createWorkspace(options = {}) {
        const snapshot = input.readProject(ref);
        if (!snapshot) throw new Error("Project is no longer available");
        const source = options.source ?? { kind: "directory", path: snapshot.rootPath };
        return input.resolveHost(ref.hostId).workspaces.create({ ...options, source });
      },
    };
  }
  return Object.assign(remio, {
    workspaces: Object.assign(remio.workspaces, { ref: refWorkspace }),
    agents: Object.assign(remio.agents, { ref: refAgent }),
    projects: Object.assign(remio.projects, { ref: project }),
    terminals: Object.assign(remio.terminals, { ref: terminal }),
  });
}
