/**
 * Next.js instrumentation hook. Runs once per server process on startup, in
 * BOTH the Node and Edge runtimes. The actual scheduler touches the DB +
 * Jellyfin (node:crypto/dns/net), so it MUST NOT be bundled for Edge. Keeping it
 * in a separate module imported only inside this `=== "nodejs"` block lets Next
 * statically drop it from the Edge build (process.env.NEXT_RUNTIME is replaced at
 * build time, so the import becomes dead code there).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
