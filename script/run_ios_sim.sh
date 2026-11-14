#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"

SIMULATOR="${1:-booted}"
APP="$PWD/src-tauri/gen/apple/build/lifeos_iOS.xcarchive/Products/Applications/LifeOS.app"

if ! xcrun simctl bootstatus "$SIMULATOR" -b >/dev/null 2>&1; then
  echo "Boot an iOS simulator first, or pass its device ID." >&2
  exit 1
fi

npx tauri ios build --debug --target aarch64-sim --no-sign --ci --archive-only
xcrun simctl terminate "$SIMULATOR" com.lifeos.desktop >/dev/null 2>&1 || true
xcrun simctl install "$SIMULATOR" "$APP"
xcrun simctl launch "$SIMULATOR" com.lifeos.desktop
