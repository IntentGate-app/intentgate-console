/**
 * Server-only configuration read from process.env.
 *
 * The console is a thin operator UI for the IntentGate gateway. The
 * admin token grants full revoke / list-revocations authority on the
 * gateway, so it MUST stay on the Next.js server — never serialized
 * to a client component, never put in NEXT_PUBLIC_* prefix.
 *
 * Anything in this file is fetched via `import "server-only"` (see
 * gateway.ts) so accidental client-side imports fail at build time.
 */

import "server-only";

export interface Config {
  gatewayUrl: string;
  adminToken: string;
}

let cached: Config | null = null;

/**
 * Read and validate config. Cached after the first call so we don't
 * re-parse env vars on every request.
 *
 * Required env vars:
 *   INTENTGATE_GATEWAY_URL  e.g. http://localhost:8080
 *   INTENTGATE_ADMIN_TOKEN  matches the gateway's INTENTGATE_ADMIN_TOKEN
 *
 * Throws on missing or empty values. The server component renders
 * a helpful error page when this throws (see app/page.tsx).
 */
export function getConfig(): Config {
  if (cached) return cached;

  const gatewayUrl = process.env.INTENTGATE_GATEWAY_URL?.trim();
  const adminToken = process.env.INTENTGATE_ADMIN_TOKEN?.trim();

  if (!gatewayUrl) {
    throw new Error(
      "INTENTGATE_GATEWAY_URL is required. Set it in .env.local: " +
        'INTENTGATE_GATEWAY_URL="http://localhost:8080"',
    );
  }
  if (!adminToken) {
    throw new Error(
      "INTENTGATE_ADMIN_TOKEN is required. Set it in .env.local to " +
        "match the gateway's INTENTGATE_ADMIN_TOKEN.",
    );
  }

  cached = {
    gatewayUrl: gatewayUrl.replace(/\/$/, ""),
    adminToken,
  };
  return cached;
}
