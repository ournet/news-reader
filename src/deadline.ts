/**
 * A single soft deadline for the whole run.
 *
 * Cron restarts this app on a fixed interval, so a run that overshoots its
 * interval is never useful: the next run will pick the same feeds up anyway.
 * Stopping between items lets the current item finish cleanly (and the feed
 * bookmark be written) instead of being killed mid-write.
 */
let deadlineAt = Infinity;

export function setDeadline(ms: number) {
  deadlineAt = Date.now() + ms;
}

export function isPastDeadline() {
  return Date.now() >= deadlineAt;
}

export function millisecondsLeft() {
  return Math.max(0, deadlineAt - Date.now());
}
