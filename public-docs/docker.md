---
title: Docker
description: Run the Remio daemon and bundled web UI with the official Docker image.
nav: Docker
order: 6
category: Getting started
---

# Docker

The official Remio Docker image runs the daemon and serves the bundled browser UI from the same HTTP origin. It is meant for servers, dev boxes, NAS devices, homelab hosts, and other places where you want Remio running without the desktop app.

Docker images follow the stable Remio release cadence. `ghcr.io/getremio/remio:latest` points at the latest stable release, not an arbitrary `main` build.

```bash
docker run -d --name remio \
  -p 7676:7676 \
  -e REMIO_PASSWORD=change-me \
  -v "$PWD/remio-home:/home/remio" \
  -v "$PWD:/workspace" \
  ghcr.io/getremio/remio:latest
```

Then open:

```text
http://localhost:7676
```

If you set `REMIO_PASSWORD`, use that same password when adding the direct daemon connection in the web UI, mobile app, or CLI.

## What the image includes

The image:

- installs the Remio daemon and CLI
- serves the bundled web UI
- listens on `0.0.0.0:7676` inside the container
- stores daemon state under `/home/remio/.remio`
- runs the daemon and launched agents as the non-root `remio` user

The image does not bundle agent CLIs such as Claude Code, Codex, OpenCode, Copilot, Pi, or Muse Code. Add the agents you use with a small child image.

Host-side CLI commands select the container explicitly, for example `remio project ls --host 127.0.0.1:7676`. Without an endpoint selector the CLI looks for a local home’s supervisor. Container environment settings are deployment overrides; worker restart preserves them. Your container manager owns full supervisor replacement.

## Docker Compose

```yaml
services:
  remio:
    image: ghcr.io/getremio/remio:latest
    container_name: remio
    restart: unless-stopped
    ports:
      - "7676:7676"
    environment:
      REMIO_PASSWORD: "change-me"
      # REMIO_HOSTNAMES: "remio.example.com,.lan"
    volumes:
      - ./remio-home:/home/remio
      - ./workspace:/workspace
```

Start it:

```bash
docker compose up -d
```

## Install agent CLIs

Create a child image for the providers you want available:

```Dockerfile
FROM ghcr.io/getremio/remio:latest

USER root
RUN npm install -g @openai/codex @anthropic-ai/claude-code opencode-ai
```

Build it:

```bash
docker build -t remio-with-agents .
```

Then use `image: remio-with-agents` in Compose.

Leave the child image user as root. The base entrypoint uses root only for first-run mounted-volume setup, then drops the daemon and launched agents to the non-root `remio` user.

You can authenticate agents either by passing provider environment variables or by running the provider login flow inside the container:

```bash
docker exec -it --user remio remio codex
docker exec -it --user remio remio claude
```

Agent credentials persist in `/home/remio`.

## Volumes

Mount two paths for most deployments:

| Mount         | Purpose                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| `/home/remio` | Remio state plus agent config and credentials such as `.codex`, `.claude` |
| `/workspace`  | Code that Remio and launched agents can read and write                    |

On Linux, the built-in `remio` user is uid/gid `1000:1000`. Make mounted directories writable by that user, or run the container with Docker's `--user` / Compose `user:` option.

## Reverse proxy

Forward normal HTTP traffic and WebSocket upgrades to the container.

Caddy:

```caddy
remio.example.com {
  reverse_proxy 127.0.0.1:7676
}
```

Nginx:

```nginx
server {
    listen 443 ssl;
    server_name remio.example.com;

    location / {
        proxy_pass http://127.0.0.1:7676;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

If you reach Remio by DNS name, allow that host:

```yaml
environment:
  REMIO_HOSTNAMES: "remio.example.com,.lan"
```

IPs and `localhost` are allowed by default.

## Security

Set `REMIO_PASSWORD` for any published port or network-reachable deployment. Use HTTPS at your reverse proxy for browser access outside localhost.

The static web UI is public on the daemon origin. The daemon API and WebSocket are protected by password auth when configured.

Agents can access whatever you mount into `/workspace` and whatever credentials you place in `/home/remio`. Keep those mounts scoped to what the agents should be able to use.

See [Security](/docs/security) for the full daemon trust model.

## Troubleshooting

- **The UI loads but cannot connect:** if `REMIO_PASSWORD` is set, add a direct connection with the same password.
- **403 Host not allowed:** set `REMIO_HOSTNAMES` to the DNS names you use.
- **Provider not available:** install that agent CLI in a child image or make sure the binary is on `PATH`.
- **Permission errors in `/workspace`:** make the mounted directory writable by uid/gid `1000:1000`, or run the container as the host uid/gid.
- **Logs:** run `docker logs remio`, or inspect `/home/remio/.remio/daemon.log` inside the container.
