#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$SCRIPT_DIR/../node_modules/.bin:$PATH"

source "$SCRIPT_DIR/dev-home.sh"

export REMIO_LISTEN="${REMIO_LISTEN:-127.0.0.1:7677}"
configure_dev_remio_home

if [ -z "${REMIO_LOCAL_MODELS_DIR}" ]; then
  export REMIO_LOCAL_MODELS_DIR="$HOME/.remio/models/local-speech"
  mkdir -p "$REMIO_LOCAL_MODELS_DIR"
fi

echo "══════════════════════════════════════════════════════"
echo "  Remio Dev Daemon"
echo "══════════════════════════════════════════════════════"
echo "  Home:    ${REMIO_HOME}"
echo "  Models:  ${REMIO_LOCAL_MODELS_DIR}"
echo "  Listen:  ${REMIO_LISTEN}"
echo "══════════════════════════════════════════════════════"

export REMIO_CORS_ORIGINS="${REMIO_CORS_ORIGINS:-*}"
export REMIO_NODE_INSPECT="${REMIO_NODE_INSPECT:---inspect=0}"

if [ "${REMIO_SKIP_DEV_SERVER_BUILD:-0}" = "1" ]; then
  exec npm run dev:server:watch
fi

exec sh -c 'npm run build:server-deps && npm run dev:server:watch'
