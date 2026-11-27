import { z } from "zod";

const TCP_PORT_RANGE_PATTERN = /^(\d{1,5})-(\d{1,5})$/;

export const RemioServicePortAllocationSchema = z
  .object({
    range: z.string().trim().regex(TCP_PORT_RANGE_PATTERN).optional(),
    portScript: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine(
    (value) => value.range !== undefined || value.portScript !== undefined,
    "Expected range or portScript",
  )
  .refine((value) => {
    if (!value.range) return true;
    const match = TCP_PORT_RANGE_PATTERN.exec(value.range);
    if (!match) return false;
    const start = Number(match[1]);
    const end = Number(match[2]);
    return start >= 1 && end <= 65_535 && start <= end;
  }, "Expected an inclusive TCP port range from 1-65535");

export function normalizeLifecycleCommands(commands: unknown): string[] {
  if (typeof commands === "string") {
    return commands.trim().length > 0 ? [commands] : [];
  }
  if (!Array.isArray(commands)) {
    return [];
  }
  return commands.filter((command): command is string => {
    return typeof command === "string" && command.trim().length > 0;
  });
}

export const RemioLifecycleCommandRawSchema = z.union([z.string(), z.array(z.string())]);

export const RemioScriptEntryRawSchema = z
  .object({
    type: z.unknown().optional(),
    command: z.unknown().optional(),
    port: z.unknown().optional(),
  })
  .passthrough();

export const RemioWorktreeConfigRawSchema = z
  .object({
    setup: RemioLifecycleCommandRawSchema.optional(),
    teardown: RemioLifecycleCommandRawSchema.optional(),
    // Checked by WorktreeConfigSchema, where an invalid value falls back to the default, so it
    // never stops remio.json from being edited or sent to the app.
    teardownTimeoutMs: z.unknown().optional(),
    terminals: z.unknown().optional(),
    servicePorts: RemioServicePortAllocationSchema.optional(),
  })
  .passthrough();

export const RemioMetadataGenerationEntrySchema = z
  .object({
    instructions: z.string().optional(),
  })
  .passthrough()
  .catch({});

export const RemioMetadataGenerationSchema = z
  .object({
    title: RemioMetadataGenerationEntrySchema.optional(),
    branchName: RemioMetadataGenerationEntrySchema.optional(),
    commitMessage: RemioMetadataGenerationEntrySchema.optional(),
    pullRequest: RemioMetadataGenerationEntrySchema.optional(),
  })
  // COMPAT(projectMetadataAgentTitle): `agentTitle` project metadata prompts were removed
  // in v0.1.96; keep legacy remio.json parseable until 2026-12-16.
  .passthrough()
  .catch({});

export const RemioConfigRawSchema = z
  .object({
    worktree: RemioWorktreeConfigRawSchema.optional(),
    scripts: z.record(z.string(), RemioScriptEntryRawSchema).optional(),
    metadataGeneration: RemioMetadataGenerationSchema.optional(),
  })
  .passthrough();

// Node timers can't wait longer than this; a longer delay fires at once.
const MAX_TIMER_DELAY_MS = 2_147_483_647;

export const WorktreeConfigSchema = RemioWorktreeConfigRawSchema.extend({
  setup: z.unknown().optional().transform(normalizeLifecycleCommands),
  teardown: z.unknown().optional().transform(normalizeLifecycleCommands),
  // Its own catch, so an invalid limit doesn't drop the commands with the rest of the worktree.
  teardownTimeoutMs: z
    .number()
    .int()
    .positive()
    .max(MAX_TIMER_DELAY_MS)
    .optional()
    .catch(undefined),
})
  .passthrough()
  .catch({ setup: [], teardown: [] });

export const ScriptEntrySchema = RemioScriptEntryRawSchema.catch({});

export const RemioConfigSchema = RemioConfigRawSchema.extend({
  worktree: WorktreeConfigSchema.optional(),
  scripts: z.record(z.string(), ScriptEntrySchema).optional().catch({}),
  metadataGeneration: RemioMetadataGenerationSchema.optional(),
})
  .passthrough()
  .catch({});

export const RemioConfigRevisionSchema = z.object({
  mtimeMs: z.number(),
  size: z.number(),
});

export const ProjectConfigRpcErrorSchema = z.discriminatedUnion("code", [
  z.object({ code: z.literal("project_not_found") }),
  z.object({ code: z.literal("invalid_project_config") }),
  z.object({
    code: z.literal("stale_project_config"),
    currentRevision: RemioConfigRevisionSchema.nullable(),
  }),
  z.object({ code: z.literal("write_failed") }),
]);

export type RemioScriptEntryRaw = z.infer<typeof RemioScriptEntryRawSchema>;
export type RemioMetadataGenerationEntry = z.infer<typeof RemioMetadataGenerationEntrySchema>;
export type RemioMetadataGeneration = z.infer<typeof RemioMetadataGenerationSchema>;
export type RemioServicePortAllocation = z.infer<typeof RemioServicePortAllocationSchema>;
export type RemioConfigRaw = z.infer<typeof RemioConfigRawSchema>;
export type RemioConfig = z.infer<typeof RemioConfigSchema>;
export type RemioConfigRevision = z.infer<typeof RemioConfigRevisionSchema>;
export type ProjectConfigRpcError = z.infer<typeof ProjectConfigRpcErrorSchema>;
