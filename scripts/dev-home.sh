#!/usr/bin/env bash

default_dev_remio_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

seed_worktree_remio_home() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  node "$script_dir/seed-dev-home.mjs" "${REMIO_DEV_SEED_HOME:-$HOME/.remio}" "$1"
}

configure_dev_daemon_config() {
  if [ -z "${REMIO_LISTEN:-}" ]; then
    return
  fi

  mkdir -p "$REMIO_HOME"
  node -e '
const fs = require("fs");
const [path, listen] = [process.argv[1], process.argv[2]];
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path, "utf8")); } catch {}
cfg.version = cfg.version || 1;
cfg.daemon = cfg.daemon || {};
cfg.daemon.listen = listen;
cfg.daemon.cors = cfg.daemon.cors || {};
cfg.daemon.cors.allowedOrigins = ["*"];
fs.writeFileSync(path, JSON.stringify(cfg, null, 2));
' "$REMIO_HOME/config.json" "$REMIO_LISTEN"
}

resolve_dev_daemon_endpoint() {
  if [ -n "${REMIO_DEV_DAEMON_ENDPOINT:-}" ]; then
    echo "$REMIO_DEV_DAEMON_ENDPOINT"
    return
  fi

  case "${REMIO_LISTEN:-127.0.0.1:7677}" in
    0.0.0.0:*) echo "localhost:${REMIO_LISTEN#0.0.0.0:}" ;;
    127.0.0.1:*) echo "localhost:${REMIO_LISTEN#127.0.0.1:}" ;;
    *) echo "$REMIO_LISTEN" ;;
  esac
}

configure_dev_remio_home() {
  if [ -n "${REMIO_HOME:-}" ]; then
    export REMIO_HOME
    if [ -n "${REMIO_DEV_SEED_HOME:-}" ]; then
      seed_worktree_remio_home "$REMIO_HOME"
    fi
    mkdir -p "$REMIO_HOME"
    if [ "${REMIO_DEV_MANAGED_HOME:-0}" = "1" ] || [ -n "${REMIO_DEV_SEED_HOME:-}" ]; then
      configure_dev_daemon_config
    fi
    return
  fi

  export REMIO_HOME
  local dev_root
  dev_root="${REMIO_DEV_ROOT:-$(default_dev_remio_root)}"
  REMIO_HOME="$dev_root/.dev/remio-home"
  export REMIO_DEV_MANAGED_HOME=1

  if [ -n "${REMIO_DEV_SEED_HOME:-}" ]; then
    seed_worktree_remio_home "$REMIO_HOME"
  fi

  mkdir -p "$REMIO_HOME"
  configure_dev_daemon_config
}

configure_dev_command_env() {
  if [ -z "${REMIO_LISTEN:-}" ]; then
    if [ -n "${REMIO_SERVICE_DAEMON_PORT:-}" ]; then
      export REMIO_LISTEN="0.0.0.0:${REMIO_SERVICE_DAEMON_PORT}"
    else
      export REMIO_LISTEN="127.0.0.1:7677"
    fi
  fi

  configure_dev_remio_home
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  if [ "$#" -gt 0 ]; then
    configure_dev_command_env
    exec "$@"
  fi

  configure_dev_remio_home
fi
