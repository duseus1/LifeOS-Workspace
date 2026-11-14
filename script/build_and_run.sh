#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"
MODE="${1:-run}"
# Do not force-quit a running editor with potentially unsaved changes.
if pgrep -x lifeos >/dev/null; then
  osascript -e 'tell application id "com.lifeos.desktop" to quit'
fi
npm run package
APP="$PWD/src-tauri/target/release/bundle/macos/LifeOS.app"
case "$MODE" in
  run) open "$APP" ;;
  --verify) open "$APP"; sleep 2; pgrep -x lifeos ;;
  --debug) lldb "$APP/Contents/MacOS/lifeos" ;;
  --logs|--telemetry) open "$APP"; /usr/bin/log stream --info --predicate 'process == "lifeos"' ;;
  *) echo 'Usage: script/build_and_run.sh [--verify|--debug|--logs|--telemetry]' >&2; exit 2 ;;
esac
