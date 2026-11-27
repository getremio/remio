# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:22-bookworm-slim
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS source-pack

ARG REMIO_VERSION

ENV ONNXRUNTIME_NODE_INSTALL=skip

WORKDIR /tmp/remio-src
COPY . .

RUN set -eux; \
    if [ -n "${REMIO_VERSION:-}" ]; then \
      test "$(node -p "require('./package.json').version")" = "${REMIO_VERSION}"; \
    fi; \
    node -e 'const fs=require("node:fs"); const pkg=JSON.parse(fs.readFileSync("package.json","utf8")); delete pkg.scripts.prepare; fs.writeFileSync("package.json", `${JSON.stringify(pkg)}\n`);'; \
    npm ci

RUN set -eux; \
    mkdir -p /tmp/remio-packs; \
    npm pack --workspace=@getremio/highlight --pack-destination /tmp/remio-packs; \
    npm pack --workspace=@getremio/relay --pack-destination /tmp/remio-packs; \
    npm pack --workspace=@getremio/protocol --pack-destination /tmp/remio-packs; \
    npm pack --workspace=@getremio/client --pack-destination /tmp/remio-packs; \
    npm pack --workspace=@getremio/plugin --pack-destination /tmp/remio-packs; \
    npm pack --workspace=@getremio/server --pack-destination /tmp/remio-packs; \
    npm pack --workspace=@getremio/cli --pack-destination /tmp/remio-packs

FROM ${NODE_IMAGE}

ENV HOME=/home/remio \
    REMIO_HOME=/home/remio/.remio \
    REMIO_LISTEN=0.0.0.0:7676 \
    REMIO_WEB_UI_ENABLED=true \
    REMIO_LOG_FORMAT=json \
    REMIO_LOG_LEVEL=info \
    CLAUDE_CONFIG_DIR=/home/remio/.claude \
    CODEX_HOME=/home/remio/.codex \
    XDG_CONFIG_HOME=/home/remio/.config \
    XDG_DATA_HOME=/home/remio/.local/share \
    XDG_STATE_HOME=/home/remio/.local/state \
    XDG_CACHE_HOME=/home/remio/.cache \
    ONNXRUNTIME_NODE_INSTALL=skip

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      bash \
      ca-certificates \
      curl \
      git \
      gosu \
      lbzip2 \
      openssh-client \
      procps \
      tini; \
    rm -rf /var/lib/apt/lists/*

COPY --from=source-pack /tmp/remio-packs /tmp/remio-packs
RUN set -eux; \
	npm install -g /tmp/remio-packs/*.tgz; \
    rm -rf /tmp/remio-packs; \
    npm cache clean --force; \
    server_entry="$(npm root -g)/@getremio/server/dist/scripts/supervisor-entrypoint.js"; \
    test -f "$server_entry"; \
    printf '%s\n' "$server_entry" > /etc/remio-server-entry; \
    node --check "$server_entry"

RUN set -eux; \
    existing_group="$(getent group 1000 | cut -d: -f1 || true)"; \
    if [ -n "$existing_group" ] && [ "$existing_group" != "remio" ]; then \
      groupmod --new-name remio "$existing_group"; \
    elif [ -z "$existing_group" ]; then \
      groupadd --gid 1000 remio; \
    fi; \
    existing_user="$(getent passwd 1000 | cut -d: -f1 || true)"; \
    if [ -n "$existing_user" ] && [ "$existing_user" != "remio" ]; then \
      usermod --login remio --gid remio --home /home/remio --shell /bin/bash "$existing_user"; \
    elif [ -z "$existing_user" ]; then \
      useradd --uid 1000 --gid remio --create-home --home-dir /home/remio --shell /bin/bash remio; \
    fi; \
    mkdir -p \
      /workspace \
      "$REMIO_HOME" \
      "$CLAUDE_CONFIG_DIR" \
      "$CODEX_HOME" \
      "$XDG_CONFIG_HOME" \
      "$XDG_DATA_HOME" \
      "$XDG_STATE_HOME" \
      "$XDG_CACHE_HOME"; \
    chown -R remio:remio /home/remio /workspace

COPY docker/base/rootfs/ /
RUN chmod +x /usr/local/bin/remio-docker-entrypoint

WORKDIR /workspace

EXPOSE 7676
VOLUME ["/home/remio"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const listen=process.env.REMIO_LISTEN||'0.0.0.0:7676'; const m=listen.match(/:(\\d+)$/); const port=m?Number(m[1]):7676; require('http').get({hostname:'127.0.0.1',port,path:'/api/health'},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/remio-docker-entrypoint"]
