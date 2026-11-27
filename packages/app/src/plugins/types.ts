import type { PluginText } from "@getremio/plugin/client";
import type { RemioApi } from "@getremio/client";
import type { QueryClient } from "@tanstack/react-query";
import type { PluginRequirements } from "@getremio/protocol/messages";
import type {
  PluginAttachmentSourceContribution as SDKPluginAttachmentSourceContribution,
  PluginCleanup,
  PluginThemeContribution as SDKPluginThemeContribution,
} from "@getremio/plugin";
import type {
  PluginFilePanelContribution as SDKPluginFilePanelContribution,
  PluginCommandCenterItemContribution as SDKPluginCommandCenterItemContribution,
  PluginClientSlashCommandContribution as SDKPluginClientSlashCommandContribution,
  PluginComposerItemContribution,
  PluginNewWorkspaceItemContribution,
  PluginComposerPillContribution as SDKPluginComposerPillContribution,
  PluginSidebarContribution as SDKPluginSidebarContribution,
  PluginSidebarViewContribution,
  PluginSidebarItemContribution as SDKPluginSidebarItemContribution,
  PluginWorkspaceRowBadgeItemContribution as SDKPluginWorkspaceRowBadgeItemContribution,
  PluginScreenContribution as SDKPluginScreenContribution,
  PluginSettingsScreenContribution as SDKPluginSettingsScreenContribution,
  PluginTimelineRendererContribution,
  PluginTimelineTransformerContribution,
  PluginPanelLocation,
  PluginWorkspacePanelContribution as SDKPluginWorkspacePanelContribution,
} from "@getremio/plugin/client";

type PluginFilePanelContribution = SDKPluginFilePanelContribution<PluginText>;
type PluginAttachmentSourceContribution = SDKPluginAttachmentSourceContribution<PluginText>;
type PluginThemeContribution = SDKPluginThemeContribution<PluginText>;
type PluginCommandCenterItemContribution = SDKPluginCommandCenterItemContribution<PluginText>;
type PluginClientSlashCommandContribution = SDKPluginClientSlashCommandContribution<PluginText>;
type PluginComposerPillContribution = SDKPluginComposerPillContribution<PluginText>;
type PluginSidebarContribution = SDKPluginSidebarContribution<PluginText>;
type PluginSidebarItemContribution = SDKPluginSidebarItemContribution<PluginText>;
type PluginWorkspaceRowBadgeItemContribution =
  SDKPluginWorkspaceRowBadgeItemContribution<PluginText>;
type PluginScreenContribution = SDKPluginScreenContribution<PluginText>;
type PluginSettingsScreenContribution = SDKPluginSettingsScreenContribution<PluginText>;
type WorkspacePanelInput = SDKPluginWorkspacePanelContribution<PluginText>;
type PluginWorkspacePanelContribution =
  | (Extract<WorkspacePanelInput, { context?: "workspace" }> & { context: "workspace" })
  | Extract<WorkspacePanelInput, { context: "agent" }>;

export type PluginSidebarSection = "header" | "footer";

export type EvaluatedPluginWorkspacePanelContribution = PluginWorkspacePanelContribution & {
  locations: readonly PluginPanelLocation[];
};

export interface EvaluatedPlugin {
  id: string;
  cleanup: PluginCleanup;
  surfaces: PluginScreenContribution[];
  settingsScreens: PluginSettingsScreenContribution[];
  sidebarViews: PluginSidebarViewContribution<PluginText>[];
  sidebarItems: Record<PluginSidebarSection, PluginSidebarItemContribution[]>;
  // COMPAT(pluginSidebarAliases): added in v0.11.0, remove after 2027-03-29
  /** `addSidebarItem` registrations, so `/plugin/<id>/sidebar/<item>` routes keep resolving. */
  legacySidebarItems: PluginSidebarContribution[];
  workspaceRowBadgeItems: PluginWorkspaceRowBadgeItemContribution[];
  filePanels: PluginFilePanelContribution[];
  composerItems: PluginComposerItemContribution[];
  newWorkspaceItems: PluginNewWorkspaceItemContribution[];
  workspacePanels: EvaluatedPluginWorkspacePanelContribution[];
  commandCenterItems: PluginCommandCenterItemContribution[];
  clientSlashCommands: PluginClientSlashCommandContribution[];
  attachmentSources: PluginAttachmentSourceContribution[];
  themes: PluginThemeContribution[];
  timelineTransformers: PluginTimelineTransformerContribution[];
  timelineRenderers: PluginTimelineRendererContribution[];
}

export interface InstalledPlugin extends EvaluatedPlugin {
  lifetime: AbortController;
  /** Immutable presentation locale, refreshed without replacing the installation lifetime. */
  locale: string;
  i18n: import("@getremio/plugin/client/host").PluginTranslationRuntime;
  /** The plugin's one Remio client, `useRemio()` in every surface; disposed at teardown. */
  remio: RemioApi;
  /** Calls one of the plugin's server RPC methods on its host. */
  invoke(method: string, input: unknown): Promise<unknown>;
  /** Subscribes to one of the plugin's server subscriptions; released with the lifetime. */
  subscribe: import("@getremio/plugin/client/host").PluginSubscribe;
  serverId: string;
  requirements?: PluginRequirements;
  clientBundle: string;
  queryClient: QueryClient;
}

export type {
  PluginFilePanelContribution,
  PluginAttachmentSourceContribution,
  PluginCommandCenterItemContribution,
  PluginClientSlashCommandContribution,
  PluginComposerItemContribution,
  PluginNewWorkspaceItemContribution,
  PluginComposerPillContribution,
  PluginSidebarContribution,
  PluginSidebarItemContribution,
  PluginWorkspaceRowBadgeItemContribution,
  PluginScreenContribution,
  PluginSettingsScreenContribution,
  PluginThemeContribution,
  PluginTimelineRendererContribution,
  PluginTimelineTransformerContribution,
  PluginWorkspacePanelContribution,
};
