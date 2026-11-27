$ErrorActionPreference = "Stop"

# Ensure node_modules/.bin is in PATH
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:PATH = "$ScriptDir\..\node_modules\.bin;$env:PATH"

# Derive REMIO_HOME: stable name for worktrees, temporary dir otherwise
if (-not $env:REMIO_HOME) {
    $GitDir = git rev-parse --git-dir 2>$null
    $GitCommonDir = git rev-parse --git-common-dir 2>$null

    if ($GitDir -and $GitCommonDir -and ($GitDir -ne $GitCommonDir)) {
        # Inside a worktree — derive a stable home from the worktree name
        $WorktreeRoot = git rev-parse --show-toplevel
        $WorktreeName = (Split-Path -Leaf $WorktreeRoot).ToLower() -replace '[^a-z0-9-]', '-' -replace '-+', '-' -replace '^-|-$', ''
        $env:REMIO_HOME = "$env:USERPROFILE\.remio-$WorktreeName"
        New-Item -ItemType Directory -Force -Path $env:REMIO_HOME | Out-Null
    } else {
        $env:REMIO_HOME = Join-Path ([System.IO.Path]::GetTempPath()) "remio-dev-$([System.Guid]::NewGuid().ToString('N').Substring(0,6))"
        New-Item -ItemType Directory -Force -Path $env:REMIO_HOME | Out-Null
        # Register cleanup on exit
        $TempRemioHome = $env:REMIO_HOME
        Register-EngineEvent PowerShell.Exiting -Action {
            Remove-Item -Recurse -Force $TempRemioHome -ErrorAction SilentlyContinue
        } | Out-Null
    }
}

# Share speech models with the main install to avoid duplicate downloads
if (-not $env:REMIO_LOCAL_MODELS_DIR) {
    $env:REMIO_LOCAL_MODELS_DIR = "$env:USERPROFILE\.remio\models\local-speech"
    New-Item -ItemType Directory -Force -Path $env:REMIO_LOCAL_MODELS_DIR | Out-Null
}

Write-Host @"
======================================================
  Remio Dev (Windows)
======================================================
  Home:    $($env:REMIO_HOME)
  Models:  $($env:REMIO_LOCAL_MODELS_DIR)
  Daemon:  localhost:7677
======================================================
"@

# Allow any origin in dev so Electron on random ports all work.
# SECURITY: wildcard CORS is unsafe in production — only acceptable here because
# the daemon binds to localhost and this script is never used for production.
$env:REMIO_CORS_ORIGINS = "*"

# Configure the app to auto-connect to this daemon on localhost
$env:APP_VARIANT = "development"
$env:EXPO_PUBLIC_LOCAL_DAEMON = "localhost:7677"
$env:EXPO_PUBLIC_REMIO_DEV_BUILD_LABEL = (git branch --show-current).Trim()
$env:REMIO_LISTEN = "127.0.0.1:7677"
$env:BROWSER = "none"

# Run both with concurrently
concurrently `
    --names "daemon,metro" `
    --prefix-colors "cyan,magenta" `
    "npm run dev:server:watch" `
    "cd packages/app && npx expo start"
