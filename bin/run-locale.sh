#!/bin/sh
#
# Runs the news-reader for one locale, with the resource limits the box needs.
#
#   ./bin/run-locale.sh ro-ro
#
# Every knob below exists because this app runs as several concurrent cron
# processes on one small instance, and every default is tuned for a process that
# owns the whole machine.
set -eu

if [ $# -lt 1 ]; then
  echo "usage: $0 <locale>   e.g. $0 ro-ro" >&2
  exit 64
fi

LOCALE="$1"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$APP_DIR"

# glibc gives every thread its own malloc arena (up to 8 * ncores). sharp is
# threaded, so unbounded arenas turn ~300MB of live data into GBs of RSS.
export MALLOC_ARENA_MAX="${MALLOC_ARENA_MAX:-2}"

# libuv's pool serves fs and dns here; the default 4 per process is more than
# this workload needs when several processes share a couple of vCPUs.
export UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-2}"

# libvips defaults to one worker thread per CPU, per process.
export SHARP_CONCURRENCY="${SHARP_CONCURRENCY:-1}"

# Soft deadline: the app stops between feeds and exits, leaving the rest to the
# next tick. Keep it comfortably below the cron interval.
export MAX_RUN_SECONDS="${MAX_RUN_SECONDS:-600}"

# Enforced by the app across all locales, so a slow locale cannot drag the
# others into the machine at once.
export MAX_CONCURRENT_RUNS="${MAX_CONCURRENT_RUNS:-2}"

export LOCALE

NODE_BIN="${NODE_BIN:-node}"
# Without a cap, V8 grows old space to ~25% of system RAM before it collects
# seriously; 320MB is roughly twice this app's live set.
NODE_HEAP_MB="${NODE_HEAP_MB:-320}"

LOCK_DIR="${LOCK_DIR:-$APP_DIR/data/locks}"
mkdir -p "$LOCK_DIR"
LOCK_FILE="$LOCK_DIR/$LOCALE.flock"

# -n: if the previous run for this locale is still going, give up now instead of
# adding a second process to the machine.
if command -v flock >/dev/null 2>&1; then
  exec flock -n "$LOCK_FILE" \
    "$NODE_BIN" --max-old-space-size="$NODE_HEAP_MB" ./lib/app.js
fi

# flock is not available (non Linux): the app's own lock still applies.
exec "$NODE_BIN" --max-old-space-size="$NODE_HEAP_MB" ./lib/app.js
