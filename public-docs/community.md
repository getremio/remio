---
title: Related projects
description: Projects related to Remio and built by the community.
nav: Related projects
order: 7
category: Getting started
---

# Related projects

These projects are related to Remio and built by the community.

## Plugins

Browse the [plugin registry](/plugins) for reviewed community plugins. To share your own, follow
[Publish a plugin](/docs/plugins/publishing) for package preparation and submission.
Plugins run unsandboxed; read their listing and source before installing.

## Tools and integrations

| Project                                                                                      | What it does                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [Remio for VS Code](https://marketplace.visualstudio.com/items?itemName=hinnes.remio-vscode) | Opens the matching Remio project or worktree in VS Code and adds agent chat, file mentions, and editor links.                        |
| [VS Code Web plugin](https://github.com/itsjustanks/remio-plugin-vscode-web)                 | Opens a live Remio worktree in `vscode.dev` through a VS Code tunnel, including workspaces on headless hosts.                        |
| [Remio Icon](https://github.com/gpambrozio/remio-menubar)                                    | Shows workspace status across Remio hosts in the macOS menu bar and opens a workspace with one click.                                |
| [Remio Cross-Daemon Comms](https://github.com/xpufx/remio-cross-daemon-comms)                | Lets agents communicate with agents on another Remio daemon through an MCP server.                                                   |
| [Remio Antigravity ACP](https://github.com/tiezbro/remio-agy-acp)                            | Connects Google Antigravity CLI to Remio through ACP, with Remio-specific context, permissions, and concurrency handling.            |
| [Desvio](https://github.com/cleiter/desvio)                                                  | Rebuilds a personal fork from a set of branches, using an agent to resolve new conflicts and Git rerere to replay known resolutions. |

## Hosting and infrastructure

| Project                                                                     | What it does                                                                                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Remio Self-hosted](https://github.com/blockfeed/remio-selfhosted)          | Packages the Remio web UI and a local daemon as a Docker deployment.                                                                                                     |
| [Devbox Fleet](https://github.com/omrihaviv/devbox-fleet)                   | Provisions and maintains per-developer GCP devboxes with Remio, coding agents, and Tailscale access.                                                                     |
| [Remio Vercel Sandbox](https://github.com/vercel-labs/remio-vercel-sandbox) | Creates persistent Vercel Sandboxes running a Remio daemon with Codex, Claude Code, OpenCode, or Pi through Vercel AI Gateway. Pair each sandbox as a remote Remio host. |
