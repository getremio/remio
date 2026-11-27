import { z } from "zod";
import type { ProviderRemioToolsPolicy } from "@getremio/protocol/provider-config";
import type { AgentManager } from "../agent-manager.js";
import { isRemioToolEnabled } from "../remio-tool-policy.js";
import type { RemioToolDefinition } from "./types.js";
import { addModelVisibleStructuredContent } from "./remio-tool-serialization.js";

export function registerPluginTools(options: {
  agentManager: AgentManager;
  callerAgentId?: string;
  scope: "agent" | "top-level";
  tools: Map<string, RemioToolDefinition>;
  builtinNames: Set<string>;
  policy?: ProviderRemioToolsPolicy;
}): void {
  const { agentManager, callerAgentId, scope, tools, builtinNames, policy } = options;
  if (scope !== "agent" || !callerAgentId) return;
  for (const tool of agentManager.getPluginTools(callerAgentId)) {
    if (builtinNames.has(tool.name)) {
      throw new Error(
        `Agent tool ${tool.name} from plugin ${tool.pluginId} collides with Remio tool ${tool.name}`,
      );
    }
    if (!isRemioToolEnabled(policy, tool.name)) continue;
    tools.set(tool.name, {
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: z.fromJSONSchema(tool.inputSchema),
      async handler(input, { signal }) {
        const result = await agentManager.executePluginTool({
          pluginId: tool.pluginId,
          toolName: tool.name,
          agentId: callerAgentId,
          input,
          signal,
        });
        return addModelVisibleStructuredContent({
          content: result.text === undefined ? [] : [{ type: "text", text: result.text }],
          structuredContent: result.structuredContent,
          isError: result.isError,
        });
      },
    });
  }
}
