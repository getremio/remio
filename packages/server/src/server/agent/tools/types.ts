import type { z } from "zod";
import type { ProviderRemioToolsPolicy } from "@getremio/protocol/provider-config";

export class RemioToolInputError extends Error {
  readonly status = 400;

  constructor(
    message: string,
    readonly issues?: z.ZodError["issues"],
  ) {
    super(message);
    this.name = "RemioToolInputError";
  }
}

export interface RemioToolExecutionContext {
  signal?: AbortSignal;
  sendUpdate?: (update: RemioToolResult) => void;
}

export interface RemioToolResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  structuredContent?: unknown;
  isError?: boolean;
}

export interface RemioToolConfig {
  title?: string;
  description?: string;
  inputSchema?: z.ZodRawShape | z.ZodType;
  outputSchema?: z.ZodRawShape;
}

export interface RemioToolDefinition extends RemioToolConfig {
  name: string;
  description: string;
  handler: (input: unknown, context: RemioToolExecutionContext) => Promise<RemioToolResult>;
}

export interface RemioToolCatalog {
  tools: ReadonlyMap<string, RemioToolDefinition>;
  getTool(name: string): RemioToolDefinition | undefined;
  executeTool(
    name: string,
    input: unknown,
    context?: RemioToolExecutionContext,
  ): Promise<RemioToolResult>;
}

export interface RemioToolRuntimeContext {
  callerAgentId?: string;
  remioToolPolicy?: ProviderRemioToolsPolicy;
  enableVoiceTools?: boolean;
  voiceOnly?: boolean;
}

export type RemioToolCatalogFactory = (
  context: RemioToolRuntimeContext,
) => RemioToolCatalog | Promise<RemioToolCatalog>;
