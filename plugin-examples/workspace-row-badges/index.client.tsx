import { useWorkspace } from "@getremio/plugin/client";
import type {
  PluginClientContext,
  PluginWorkspaceRowBadgeItemProps,
} from "@getremio/plugin/client";
import { WorkspaceRowBadge } from "@getremio/plugin/client/ui";

function WorkspaceAttention({ workspaceId }: PluginWorkspaceRowBadgeItemProps) {
  const status = useWorkspace(workspaceId, (workspace) => workspace.status);
  if (status === "needs_input") {
    return <WorkspaceRowBadge icon="CircleHelp" label="Needs input" tone="warning" />;
  }
  if (status === "failed") {
    return <WorkspaceRowBadge icon="CircleAlert" label="Failed" tone="danger" />;
  }
  return null;
}

export default function contribute(client: PluginClientContext) {
  // Apps older than this API do not have the method, and requirements.remio cannot exclude them.
  if (!client.addWorkspaceRowBadgeItem) return () => {};
  client.addWorkspaceRowBadgeItem({
    id: "attention",
    title: "Workspace attention",
    icon: "CircleAlert",
    Component: WorkspaceAttention,
  });
  return () => {};
}
