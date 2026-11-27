---
title: CLI reference
description: "Remio CLI reference: manage projects, workspaces, agents, plugins, scripts, schedules, daemons, and permissions from your terminal."
nav: CLI reference
order: 35
category: Orchestration
---

# CLI reference

The Remio CLI lets you manage agents from your terminal. It's the same interface exposed by the daemon's API, so anything you can do in the app you can do from the command line.

> **Agent orchestration:** You can tell coding agents to use the Remio CLI to spawn and manage other agents. Remio recognizes the calling agent, so CLI-created workers get the same workspace and parent defaults as MCP-created workers.

## Quick reference

```bash
remio run "fix the tests"            # Start an agent
remio ls                             # List running agents
remio attach <id>                    # Stream agent output
remio send <id> "also fix linting"   # Send follow-up task
remio logs <id>                      # View agent timeline
remio stop <id>                      # Stop an agent
remio usage                          # Show account quotas and balances
```

## Account usage

Show account quotas and balances from the host's usage sources:

```bash
remio usage
remio usage ls --refresh
remio usage ls --agent <agent-id>
remio usage inspect <report-id>
remio usage inspect <report-id> --refresh
```

`remio usage` is equivalent to `remio usage ls`. The summary groups windows and balances by account, with report IDs, source and account labels, status, and fetch timestamps. Missing values appear as `-`; unavailable and failed reports include their reasons.

Copy the full report ID from the list into `inspect` to see reset times, balances and units, plan details, supplied forecasts, and login failures with recovery instructions. Report IDs require exact matches.

`--agent` selects the account quota associated with an agent. It does not measure that agent's token consumption or cost. Use the full agent ID, and do not combine `--agent` with `inspect`.

Queries use the host's five-minute cache when available. Add `--refresh` to bypass it. Use `--host` or `--home` to [select a daemon](#select-one-daemon). Hosts without usage-source support return an update message.

For OpenRouter, set `OPENROUTER_API_KEY` in the daemon’s environment to show what the key spent today, this week, and this month in UTC. Set `OPENROUTER_MANAGEMENT_KEY` to show the remaining account credits. Each variable adds its own report to the host’s Usage panel and `remio usage`.

### Usage in scripts

```bash
remio usage ls --json
remio usage inspect <report-id> --json
remio usage ls --quiet
```

List JSON is always an array, including `[]` when no reports are returned. Inspect JSON is one report entry. Each entry includes `id`, `sourceId`, `sourceLabel`, `account`, `fetchedAt`, and a nested `report`. Read `report.status` before accessing its data:

| Status        | Fields                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| `available`   | `windows`, with optional `planLabel`, `balances`, and `details`        |
| `unavailable` | `problem`, describing expired or rejected credentials or missing quota |
| `error`       | `error`, the failure message                                           |

Entries may also include `loginErrors`. Structured output preserves numeric values and optional fields. Standard `--format yaml`, `--no-headers`, and `--no-color` options are supported; `--quiet` prints full report IDs.

A completed query exits with status `0`, including when individual reports are unavailable or failed. Connection or request failures, unsupported hosts, unknown report IDs, and conflicting selectors exit with status `1` and write the error to stderr. Human output says **No usage reports returned** for an empty result; this does not establish whether account discovery succeeded for every source.

## Connected hosts

`--host` selects the daemon whose saved connections you manage. Registrations use their
`registrationId`, not their label.

```sh
remio --host localhost:7676 host add 'ssh://deploy@build-box' --label build-box --meta team=infra
remio --host localhost:7676 host ls --json
remio --host localhost:7676 host inspect hst_123
remio --host localhost:7676 host update hst_123 --meta team=tools --remove-meta obsolete
remio --host localhost:7676 host update hst_123 --connection 'ssh://deploy@new-address'
remio --host localhost:7676 host disable hst_123
remio --host localhost:7676 host enable hst_123
remio --host localhost:7676 host rm hst_123
```

Add accepts TCP/host-and-port, `ws://`/`wss://`, local socket/pipe, SSH, and relay/pairing URLs.
SSH connects to an already running daemon. Add `?password=...` to an SSH URI when that daemon requires a password (`&password=...` after `daemonPort`). Unreachable targets remain saved and retry automatically.
`ls` includes disabled and failed hosts. `inspect` includes safe connection details and recovery guidance.
JSON output never includes connection credentials.

`update --meta` replaces supplied keys; `--remove-meta` removes keys. Replacing a connection retains
the pinned daemon identity. Add `--replace-identity` with `--connection` only after verifying a changed
destination. `rm` removes the saved connection; agents and workspaces on that host keep running.

## Provider diagnostics

Ask the daemon to inspect the provider environment it actually uses:

```bash
remio provider diagnostic claude
remio provider diagnostic codex --json
remio --host devbox:7676 provider diagnostic opencode
```

The diagnostic includes the configured command, daemon `PATH` and shell, matching binaries, resolved path, version, model count, and provider status. Use the global `--host` option for a remote daemon. This is the same diagnostic shown under **Settings → your host → Providers → provider → Diagnostic report**.

## Running agents

Use `remio run` to start a new agent with a task:

```bash
remio run "implement user authentication"
remio run --provider codex "refactor the API layer"
remio run --no-wait "run the focused test suite"
remio run --output-schema schema.json "name this branch"
remio run --new-workspace worktree --worktree-mode branch-off --new-branch feature/x --base origin/main "implement feature X"
remio run --workspace <workspace-id> "review the current diff"
remio run --output-schema schema.json "extract release notes"
remio run --output-schema '{"type":"object","properties":{"summary":{"type":"string"}},"required":["summary"]}' "summarize release notes"
```

From a human shell, a bare `remio run` creates a new local workspace for the current directory. Use `--workspace <id>` to add the agent to an existing workspace, or `--new-workspace local|worktree` to explicitly create a separate workspace for the run.

Worktree creation accepts `--worktree-mode branch-off|checkout-branch|checkout-pr` plus the matching `--new-branch`/`--base`, `--branch`, or `--pr-number`/`--forge` options. Use `--worktree-slug` to choose the managed directory slug.

When an existing Remio agent runs the same command, Remio recognizes it through `REMIO_AGENT_ID`. Without explicit placement, the new agent becomes its subagent in the same workspace. `--workspace` can place that subagent elsewhere without changing its parent.

Use `--output-schema` to return only matching JSON output. You can pass a schema file path or an inline JSON schema object. This mode cannot be used with `--no-wait`.

By default, `remio run` waits for completion. Use `--no-wait` to return immediately while the agent keeps running, the same flag `remio send` takes.

The old `run --background` and `-d` aliases still mean `--no-wait`. They are deprecated, hidden
from help, and print a warning to stderr. Use `--no-wait` in scripts. Workspace visibility is
selected separately with `workspace create --background`; this release does not repurpose
`run --background`.

## Projects

Register the current directory as a project, then list the projects known to the daemon:

```bash
cd ~/dev/my-app
remio project create
remio project ls
```

Use the project ID from `remio project ls` to rename, reset, or delete a project:

```bash
remio project rename <project-id> "My app"
remio project rename <project-id> --reset
remio project delete <project-id>
```

`--reset` restores the name derived from the project directory. Deleting a project archives its active workspaces and removes the project from Remio. It does not delete the project directory.

For a local daemon, `remio project create [path]` defaults to the current directory and resolves relative paths on the CLI machine. When you use the global `--host` option or `REMIO_HOST`, provide a path that the target daemon can access:

```bash
remio --host devbox:7676 project create /srv/repos/api
```

The remote daemon interprets that path on its own machine. See [Workspaces](/docs/workspaces) for how projects group working directories and sessions.

## Workspaces

Create a workspace independently when you want to prepare its files before starting an agent:

```bash
remio workspace create --isolation local --path ~/dev/my-app --title main

remio workspace create \
  --isolation worktree \
  --path ~/dev/my-app \
  --mode branch-off \
  --new-branch feature/auth \
  --worktree-slug feature-auth \
  --base origin/main

remio workspace create \
  --isolation worktree \
  --path ~/dev/my-app \
  --mode checkout-branch \
  --branch feature/existing \
  --worktree-slug existing-copy

remio workspace create \
  --isolation worktree \
  --path ~/dev/my-app \
  --mode checkout-pr \
  --pr-number 2186
```

Add `--background` to hide a workspace from default discovery. Its agents and terminals keep
ordinary history, persistence, hooks, and restart recovery. `--no-background` explicitly overrides
caller-workspace inheritance; omission inherits when run by a Remio agent and defaults to false
from a human shell. Visibility is creation-only.

```bash
remio workspace create --isolation local --background --path /path/to/repo
remio run --workspace <workspace-id> --no-wait "review the checkout flow"
```

Exact workspace and agent IDs remain accessible regardless of listing visibility.

Then list, use, rename, or archive it:

```bash
remio workspace ls
remio workspace ls --background               # Also include background workspaces
remio run --workspace <workspace-id> "implement authentication"
remio workspace rename <workspace-id> "Auth rework"
remio workspace rename <workspace-id> --reset   # back to the branch or directory name
remio workspace archive <workspace-id>
```

Inside an agent session, `REMIO_WORKSPACE_ID` holds the agent's own workspace ID, so an agent can run `remio workspace rename "$REMIO_WORKSPACE_ID" "Auth rework"` or `remio workspace archive "$REMIO_WORKSPACE_ID"` even when other workspaces share its directory.

Add `--forge <name>` to PR checkout when Remio cannot infer the forge from the source checkout. See [Git worktrees](/docs/worktrees) for setup hooks and services.

## Terminals

Use the workspace ID when multiple workspaces share a directory:

```bash
remio terminal create --workspace <workspace-id> --name Development
remio terminal ls --workspace <workspace-id> --json
remio terminal send-keys <terminal-id> -l "echo ready"
remio terminal send-keys <terminal-id> Enter
remio terminal capture <terminal-id>
remio terminal kill <terminal-id>
```

Creation defaults to the workspace directory. Add `--cwd <absolute-path>` to change the process directory while keeping that workspace as the owner. Unknown and archived workspace IDs fail.

Without `--workspace`, creation opens the project at `--cwd` or the current directory and reuses its oldest active workspace. Listing without `--workspace` filters by `--cwd` or the current directory and can include multiple workspaces. `ls --all` lists every terminal on the host and cannot be combined with directory or workspace filters.

Create and list results include `id`, `name`, `cwd`, and `workspaceId`. Use `--json` for structured output and the global `--host` option to target another daemon. These commands require a host that supports the [workspace terminal API](/docs/sdk/reference#clientterminals); older hosts return an update message.

## Workspace scripts

List, start, and stop the scripts configured in a workspace's `remio.json`:

```bash
remio script ls
remio script start web
remio script stop web
```

By default, Remio selects the workspace whose directory is the current directory. Pass `--cwd <path>` to select a different directory, or `--workspace <workspace-id>` when a directory has multiple workspaces. Use the global `--host` option to target another daemon. These commands also accept standard output options such as `--json`.

The output includes each script's lifecycle and supervised terminal ID. Services also include their assigned port, proxy URL, and health. See [Git worktrees](/docs/worktrees#scripts-and-services) for `remio.json` configuration.

## Plugins

> **Trust every plugin you add.** `remio plugin add` and `remio plugin install` mean “I trust this codebase.” Plugin server code and Git preparation commands run unsandboxed with the daemon user's access on the daemon host; client contributions run inside Remio. Dependencies and future updates are part of that decision. With the global `--host` option, commands run on the remote daemon host.

Create and manage trusted plugins on a daemon:

```bash
remio plugin init ./plugin
remio plugin install ./plugin
remio plugin add owner/slug
remio plugin add git:owner/repository
remio plugin add https://gitlab.com/group/repository.git --ref main
remio plugin add git:owner/monorepo:plugins/review
remio plugin ls [id]
remio plugin update my-plugin
remio plugin update --all
remio plugin reload my-plugin
remio plugin logs my-plugin
remio plugin disable my-plugin
remio plugin enable my-plugin
remio plugin remove my-plugin
```

`remio plugin reload <id>` reports the result of the reload itself: it waits while the daemon stops
and starts the plugin, however long that takes, and it queues behind the daemon's other plugin work.
Cancelling the command or losing the connection does not stop the daemon's work, and no listing or
log entry settles what a cancelled reload did — the [Plugin reference](/docs/plugins/reference)
covers those interim states. Running the reload again is what reports the result: it waits behind the
outstanding one, then stops and starts the plugin once more.

Bare `owner/slug` installs a reviewed registry listing. Use `git:owner/repository` for GitHub
source, or `./plugin` for a local directory. Append `:<directory>` for a plugin in a monorepo.

`remio plugin ls [id]` does not contact the remote. `remio plugin logs <id>` returns the
plugin's recent daemon-side stdout and stderr. Add `--json` for structured entries, or run
`remio --host <target> plugin logs <id>` for another daemon. See the
[Plugin reference](/docs/plugins/reference) for installation, trust, lifecycle, and log-retention
behavior.

## Listing agents

```bash
remio ls                    # Non-archived agents in active workspaces
remio ls -a                 # Also include archived and background agents, with a BACKGROUND column
remio ls -g                 # Non-archived agents across all workspaces
remio ls -a -g --json       # All agents, including archived, as JSON
remio ls --background       # Also include background agents and agents in background workspaces
```

## Streaming output

Use `remio attach` to stream an agent's output in real-time:

```bash
remio attach abc123   # Attach to agent (Ctrl+C to detach)
```

Agent IDs can be shortened, `abc` works if it's unambiguous.

## Sending messages

Send follow-up tasks to a running or idle agent:

Use the recipient's agent ID from `remio ls`, or [copy it from the agent's tab](/docs/orchestration-workflows#send-a-prompt-to-another-agent).

```bash
remio send <id> "now run the tests"
remio send <id> --image screenshot.png "what's wrong here?"
remio send <id> --no-wait "run this task"
remio send <id> --behavior interrupt "stop and do this instead"
```

Leave `--behavior` out unless the message cannot wait. The defaults depend on who sends:

- From an agent (`REMIO_AGENT_ID` set), the default is `queue`. The message waits until the recipient's running turn ends. `--behavior steer` adds the message to the running turn, and `--behavior interrupt` stops the turn and starts a new one with the message. A steer or interrupt also delivers the messages you queued before it, in order.
- From a person, the default is `interrupt`. `--behavior steer` adds the message to the running turn instead.

If the recipient's provider cannot steer, `steer` interrupts the running turn instead. With `--no-wait`, the output says what happened to an agent's message and how to deliver a queued message now.

## Viewing logs

```bash
remio logs <id>                  # Full timeline
remio logs <id> -f               # Follow (streaming)
remio logs <id> --tail 10        # Last 10 entries
remio logs <id> --filter tools   # Only tool calls
```

## Waiting for agents

Block until an agent finishes its current task:

```bash
remio wait <id>
remio wait <id> --timeout 60   # 60 second timeout
```

Useful in scripts or when one agent needs to wait for another.

## Schedules

Run an agent on a cron schedule. The CLI also accepts simple cadence presets and compiles them to cron. See [Schedules from the CLI](/docs/schedules-cli) for the full reference.

```bash
remio schedule create --every 30m --cwd ~/dev/my-app "Continue the refactor and leave a note."
remio schedule ls
remio schedule pause <id>
```

## Permissions

Agents may request permission for certain actions. Manage these from the CLI:

```bash
remio permit ls                # List pending requests
remio permit allow <id>        # Allow all pending for agent
remio permit deny <id> --all   # Deny all pending
```

## Agent modes

Change an agent's operational mode (provider-specific):

```bash
remio agent mode <id> --list   # Show available modes
remio agent mode <id> bypass   # Set bypass mode
remio agent mode <id> plan     # Set plan mode
remio agent detach <id>        # Make a subagent top-level
```

Detaching is an explicit lifecycle action, not a creation flag. The agent keeps running; only its relationship to its parent changes.

## Daemon management

Define an instance once, then start its saved configuration:

```bash
remio daemon config set daemon.listen 127.0.0.1:6799 --home ~/remio-test
remio daemon config set daemon.relay.enabled false --home ~/remio-test
remio daemon start --home ~/remio-test
remio project ls --home ~/remio-test
remio daemon restart --home ~/remio-test
remio daemon stop --home ~/remio-test
```

`start` runs in the background and reports the actual listening address and supervisor PID. It accepts only home selection and `--timeout <seconds>` (default 600). If waiting times out, the supervisor remains running: use the printed status, log, and stop instructions. A worker that exits before becoming ready makes startup fail.

`restart` requests a replacement worker from the existing supervisor. It rereads the file and retains the supervisor's original environment and arguments. Success confirms a different ready worker, following a changed address for a home target. It never starts a stopped daemon or refreshes the supervisor binary. A timeout reports whether the request was acknowledged; it does not prove why reconnection failed.

`stop --home` waits for that local supervisor to exit. On POSIX it signals the supervisor without contacting a TCP endpoint. On Windows it uses the ready daemon's shutdown RPC; an unbound instance requires explicit `--force`. `--force` permits forced process-tree cleanup after the graceful timeout (default 15 seconds). `stop --host` only reports **shutdown requested**; remote process exit is not verified. A service manager may start another instance after the captured supervisor exits.

`status` separates local supervisor state, its published endpoint, the configured address, and RPC reachability. A stopped home is never probed at its configured address. An unbound live supervisor is **not ready**. If an authenticated local connection remains open but status details time out, the result stays `reachable` with a note explaining the unavailable details. Worker and provider fields are omitted. An explicit `--host` query still fails when its status request fails.

`reload` validates the file, applies runtime-safe changes, and reports `appliedPaths`, `restartRequiredPaths`, and `overrideControlledPaths`. It never implicitly restarts. Use `--json` or `--format yaml` for structured results. An older host lacking the capability reports that it needs an update.

The root aliases `start`, `status`, `restart`, `reload`, and `pair` use the same commands as `daemon`. Root `run` and `stop` remain agent operations.

### Foreground deployments and migration

Use environment overrides with the foreground deployment command:

```bash
REMIO_LISTEN=127.0.0.1:6799 REMIO_RELAY_ENABLED=false remio daemon run --home ~/remio-test
```

It stays attached until the supervisor exits or you cancel, without a readiness timeout. Worker restart retains these launch inputs. Stop and relaunch the deployment to change them. If the home already has a live supervisor, `run` returns `already_running` without owning or launching a foreground process.

Managed `start` ignores inherited daemon-setting overrides, including `PORT`, `REMIO_LISTEN`, relay, voice, and web UI settings. It preserves provider credentials and executable/runtime controls. `start --foreground` is removed; use `daemon run`. Former start/restart configuration flags such as `--port`, `--no-relay`, and `--web-ui` fail before side effects, with the corresponding `config set` migration. See [configuration edits](/docs/configuration#apply-changes).

### Select one daemon

Every daemon-connected CLI command accepts global `--home` or `--host`, before or after the command. A home selects a local supervisor's published endpoint; a host selects an explicit endpoint. There is no configured-address or default-port fallback.

| Selectors                                  | Result                                                 |
| ------------------------------------------ | ------------------------------------------------------ |
| `--home`                                   | That local home, overriding both environment selectors |
| `--host`                                   | That endpoint, overriding both environment selectors   |
| Both flags, or conflicting duplicate flags | `TARGET_AMBIGUOUS`                                     |
| Only `REMIO_HOME` or only `REMIO_HOST`     | The corresponding target                               |
| Both environment selectors, without a flag | `TARGET_AMBIGUOUS`                                     |
| Neither                                    | Default local home, `~/.remio`                         |

Local-only `start`, `daemon run`, `config`, `onboard`, and `set-password` reject explicit `--host` and ignore `REMIO_HOST`. Endpoint operations retain TCP, Unix socket, Windows pipe, SSH, and pairing-offer transports. A host-side CLI controlling a container needs `--host` or `REMIO_HOST`.

## Hub

```bash
remio hub login [url]          # Approve and store organization-scoped CLI access
remio hub init                 # Create and optionally deploy a starter trigger here
remio hub connect [url]        # Enroll this daemon using CLI access
remio hub projects             # List legacy projects in the authenticated organization
remio hub status               # Show the current Hub relationship
remio hub permissions list     # Show what this Hub may do on this daemon
remio hub permissions grant hub.execute    # Let Hub automations run agents here
remio hub permissions revoke hub.execute   # Take it back
remio hub disconnect           # End it
remio hub deploy               # Validate and install .remio/triggers/*.yml
remio hub deploy --dry-run     # Validate without installing
remio hub deploy -p <project>   # Deploy an existing legacy project bundle
remio hub logout               # Remove the active stored CLI login
```

Run `remio hub deploy` from the repository root. By default, it reads every direct `.remio/triggers/*.yml` file in deterministic path order and validates all triggers before installing them one at a time.

If an installation fails after earlier ones succeeded, the error lists the installed files. `--dry-run` validates without creating or activating revisions. Pass `-p, --project <slug>` for an existing legacy project bundle.

`remio hub login` opens the Hub approval page and stores an organization-scoped CLI credential under `REMIO_HOME`. In an interactive terminal, it offers to connect this daemon (default yes) and separately asks whether to grant `hub.execute` (default no).

`--json` and non-TTY logins never prompt. The stored CLI login stays separate from the daemon relationship created by `connect`.

`remio hub init` requires a TTY, signs in and connects the daemon as needed, and selects a ready integration (or sends you to **Hub → Apps** if none is ready). It then prompts for an enabled provider on your daemon that exposes both a selectable model and at least one execution mode.

Providers that report zero execution modes (such as Pi) are filtered out by `remio hub init`, but can still be configured in the Hub dashboard or in `.remio/triggers/*.yml` and deployed with `remio hub deploy`.

Setup next asks for the allowed sender identity (GitHub username, Slack member ID, or Discord user ID), validates the trigger against the connected daemon, writes `.remio/triggers/<provider>-help.yml`, and asks whether to deploy. Replacing an existing starter file requires confirmation while preserving other trigger files. See the [generated starter trigger](/docs/hub/configuration#generated-starter-trigger).

Interactive `remio hub logout` checks for a daemon connected to the same Hub and asks whether to disconnect it before deleting the login. JSON and non-interactive logouts never prompt or disconnect unless you pass `--disconnect-daemon` (with optional `--force`). If disconnection fails, the login stays intact.

Every Hub command resolves its destination and credentials in order:

- Origin precedence: explicit `[url]` or `--hub`, then `REMIO_HUB_URL`, then the active stored login, then `https://hub.remio.hoshizukimio.moe`.
- Credential precedence: `--api-key <secret>`, then `REMIO_HUB_API_KEY`, then a stored login matching the exact resolved origin.
- API keys passed via flags or environment variables are never written to disk, and stored credentials are never sent to another origin.

Human output prints the resolved destination before each action, while `--json` writes machine-readable output including the normalized Hub origin. Diagnostics name file paths without printing contents or credentials.

See [Daemons in Hub](/docs/hub/daemons), [Hub configuration](/docs/hub/configuration), and the [Hub public API](/docs/hub/api).

## Connecting to a remote daemon

The global `--host` option accepts either a local target (`host:port`, a unix socket, or a Windows pipe) or a pairing offer URL, the same `https://app.remio.hoshizukimio.moe/#offer=...` link the mobile app uses for QR pairing. With an offer URL the CLI connects through the Remio relay with end-to-end encryption, so you can drive a daemon on another machine without exposing it to the network.

Get an offer URL from the daemon you want to control:

```bash
remio daemon pair          # prints the QR and link when relay is enabled
remio daemon pair --relay  # enables relay without prompting
remio daemon pair --json   # structured output; never prompts
```

Relay is off for new installations. A disabled relay returns a `RELAY_DISABLED` error; pass `--relay` to provide explicit consent. For a stopped home, pairing is labelled offline; `--relay` saves relay enablement and the offer includes a start instruction. A live but unreachable home never falls back to an offline identity. Relay pairing is end-to-end encrypted. See [Security](/docs/security).

Use it from anywhere:

```bash
remio --host 'https://app.remio.hoshizukimio.moe/#offer=eyJ2IjoyLC...' ls
remio --host "$OFFER_URL" run "fix the failing tests"
```

You can also set it once via `REMIO_HOST` instead of passing `--host` on every command. An explicit flag overrides the environment variable.

## Multi-agent workflows

The CLI is designed to be used by agents themselves. You can instruct an agent to spawn sub-agents for parallel work:

```bash
# Agent A spawns Agent B and waits for it
agent_id=$(remio run --no-wait --quiet --title api-agent "implement the API")
remio wait "$agent_id"
remio logs "$agent_id" --tail 5
```

Because Agent A's ID is present in the environment, Agent B is created as its subagent in the same workspace unless `--workspace` is specified.

Simple implement + verify loop:

```bash
# Requires jq
while true; do
  remio run --provider codex "make the tests pass" >/dev/null

  verdict=$(remio run --provider claude --output-schema '{"type":"object","properties":{"criteria_met":{"type":"boolean"}},"required":["criteria_met"],"additionalProperties":false}' "ensure tests all pass")
  if echo "$verdict" | jq -e '.criteria_met == true' >/dev/null; then
    echo "criteria met"
    break
  fi
done
```

This pattern enables hierarchical task decomposition, a lead agent can break down work, delegate to specialists, and synthesize results.

## Output formats

Most commands support multiple output formats for scripting:

```bash
remio ls --json                # JSON output
remio ls --format yaml         # YAML output
remio ls -q                    # IDs only (quiet)
```

## Global options

- `--host <target>`, connect to a different daemon (`host:port`, unix socket, or `https://app.remio.hoshizukimio.moe/#offer=...` for relay). See [Connecting to a remote daemon](#connecting-to-a-remote-daemon).
- `--json`, JSON output
- `-q, --quiet`, minimal output
- `--no-color`, disable colors
