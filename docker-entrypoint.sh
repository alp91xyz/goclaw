#!/bin/sh
set -e

# Set up writable runtime directories for agent-installed packages.
# Rootfs is read-only; /app/data is a writable Docker volume.
RUNTIME_DIR="/app/data/.runtime"
mkdir -p "$RUNTIME_DIR/pip" "$RUNTIME_DIR/npm-global/lib"

# Python: allow agent to pip install to writable target dir
export PYTHONPATH="$RUNTIME_DIR/pip:${PYTHONPATH:-}"
export PIP_TARGET="$RUNTIME_DIR/pip"
export PIP_BREAK_SYSTEM_PACKAGES=1
export PIP_CACHE_DIR="$RUNTIME_DIR/pip-cache"
mkdir -p "$RUNTIME_DIR/pip-cache"

# Node.js: allow agent to npm install -g to writable prefix
# NODE_PATH includes both pre-installed system globals and runtime-installed globals.
export NPM_CONFIG_PREFIX="$RUNTIME_DIR/npm-global"
export NODE_PATH="/usr/local/lib/node_modules:$RUNTIME_DIR/npm-global/lib/node_modules:${NODE_PATH:-}"
export PATH="$RUNTIME_DIR/npm-global/bin:$RUNTIME_DIR/pip/bin:$PATH"

# System packages: re-install on-demand packages persisted across recreates.
# dep_installer.go appends package names to this file via doas apk add.
APK_LIST="$RUNTIME_DIR/apk-packages"
if [ -f "$APK_LIST" ] && [ -s "$APK_LIST" ]; then
  echo "Re-installing persisted system packages..."
  # shellcheck disable=SC2046
  doas apk add --no-cache $(cat "$APK_LIST" | sort -u) 2>/dev/null || \
    echo "Warning: some packages failed to install"
fi

case "${1:-serve}" in
  serve)
    # Auto-upgrade (schema migrations + data hooks) before starting.
    if [ -n "$GOCLAW_POSTGRES_DSN" ]; then
      echo "Running database upgrade..."
      /app/goclaw upgrade || \
        echo "Upgrade warning (may already be up-to-date)"
    fi
    exec /app/goclaw
    ;;
  upgrade)
    shift
    exec /app/goclaw upgrade "$@"
    ;;
  migrate)
    shift
    exec /app/goclaw migrate "$@"
    ;;
  onboard)
    exec /app/goclaw onboard
    ;;
  version)
    exec /app/goclaw version
    ;;
  *)
    exec /app/goclaw "$@"
    ;;
esac
