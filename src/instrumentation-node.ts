/**
 * Node-only startup work, imported from instrumentation.ts under the
 * `NEXT_RUNTIME === "nodejs"` guard so its node:crypto/dns/net deps never reach
 * the Edge bundle.
 *
 * Starts the hourly background job that resyncs the Jellyfin user list (new
 * Jellyfin accounts -> Jellyboxd accounts) without any external cron: `next
 * start` is a single long-lived Node process, so a setInterval here is the
 * lightest reliable scheduler (the Docker image has no wget/curl for host cron).
 */
import { syncJellyfinUsersFromPrimary } from "./lib/jellyfin/sync-users";

const ONE_HOUR = 60 * 60 * 1000;

let running = false;
const tick = async () => {
  if (running) return; // never overlap a slow run with the next tick
  running = true;
  try {
    const result = await syncJellyfinUsersFromPrimary();
    if (result.ok && (result.created ?? 0) > 0) {
      console.log(`[jellyboxd] hourly user sync: provisioned ${result.created} new user(s)`);
    }
  } finally {
    running = false;
  }
};

// First pass shortly after boot (let the DB/migrations settle), then hourly.
setTimeout(tick, 30_000);
setInterval(tick, ONE_HOUR);
