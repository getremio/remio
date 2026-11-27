import type { ToolCallDetail } from "../agent-types.js";
import { getRemioToolLeafName, isRemioToolName } from "../tool-name-normalization.js";
import { getRemioToolEntry, REMIO_TOOL_CATALOG, type RemioToolName } from "./catalog.js";
import { toSummaryText } from "./summary-text.js";

export { buildAgentMessageDisplay, type AgentMessageDisplay } from "./agent-message.js";
export {
  buildRemioToolDetailSections,
  type RemioToolDetailField,
  type RemioToolDetailSection,
} from "./detail-sections.js";
export { MAX_SUMMARY_CHARS } from "./summary-text.js";
export type { RemioToolName };

export interface RemioToolDisplayInput {
  toolName: string;
  detail: ToolCallDetail;
  /** Title of the agent named by the call's `agentId`, when the caller knows it. */
  targetAgentTitle?: string;
}

export interface RemioToolDisplay {
  displayName: string;
  summary?: string;
}

export const REMIO_TOOL_NAMES = Object.keys(REMIO_TOOL_CATALOG) as readonly RemioToolName[];

/** Returns null for tools outside the Remio namespace. */
export function buildRemioToolDisplay(input: RemioToolDisplayInput): RemioToolDisplay | null {
  // Canonical details own internal lifecycle rows such as worktree setup.
  if (input.detail.type !== "unknown") return null;
  const leafName = remioLeafName(input.toolName);
  if (!leafName) return null;
  const entry = getRemioToolEntry(leafName);
  if (!entry) return { displayName: humanizeLeafName(leafName) };

  const toolInput = readToolInput(input.detail);
  const targetAgent = input.targetAgentTitle ?? readString(toolInput.agentId);
  const summary = formatContext(entry.context?.(toolInput, targetAgent));
  return { displayName: entry.label, ...(summary ? { summary } : {}) };
}

/** A semantic action label for summaries, sharing the tool presentation catalog. */
export function getRemioToolActionLabel(toolName: string): string | null {
  const leafName = remioLeafName(toolName);
  if (!leafName) return null;
  return getRemioToolEntry(leafName)?.completedLabel ?? humanizeLeafName(leafName);
}

/** The agent a Remio call acts on, so callers can resolve its title. */
export function getRemioToolTargetAgentId(
  toolName: string,
  detail: ToolCallDetail | undefined,
): string | null {
  if (!detail || !remioLeafName(toolName)) return null;
  return readString(readToolInput(detail).agentId) ?? null;
}

function remioLeafName(toolName: string): string | null {
  if (isRemioToolName(toolName)) return getRemioToolLeafName(toolName);
  const normalized = toolName.trim().toLowerCase();
  return normalized.startsWith("remio_") && !normalized.startsWith("remio__")
    ? normalized.slice("remio_".length)
    : null;
}

function readToolInput(detail: ToolCallDetail): Readonly<Record<string, unknown>> {
  if (detail.type !== "unknown") return {};
  const value = detail.input;
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function formatContext(value: unknown): string | undefined {
  if (typeof value === "string") return toSummaryText(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const [first, ...rest] = value;
    const head = typeof first === "string" ? toSummaryText(first) : undefined;
    if (!head) return undefined;
    return rest.length > 0 ? `${head} +${rest.length}` : head;
  }
  return undefined;
}

function humanizeLeafName(leafName: string): string {
  const sentence = leafName
    .replace(/[._-]+/g, " ")
    .trim()
    .toLowerCase();
  return `${sentence[0]?.toUpperCase() ?? ""}${sentence.slice(1)}`;
}
