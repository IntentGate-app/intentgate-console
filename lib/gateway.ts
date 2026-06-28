/**
 * Server-only gateway client. Wraps the gateway's HTTP API with
 * typed methods that return parsed JSON or throw a GatewayError.
 *
 * Every method runs on the Next.js server. The admin token is read
 * from process.env via getConfig() — never from request headers,
 * never proxied through the browser.
 */

import "server-only";

import { getConfig } from "@/lib/config";
import type {
  AuditQueryFilter,
  AuditQueryResponse,
  HealthResponse,
  RevocationsResponse,
  RevokedToken,
} from "@/lib/types";

/**
 * Thrown when a gateway request fails for any non-2xx reason or a
 * transport error. The page renders a friendly error using the
 * `userMessage` field; the full `cause` is logged server-side.
 */
export class GatewayError extends Error {
  readonly status: number;
  readonly userMessage: string;
  constructor(userMessage: string, opts?: { status?: number; cause?: unknown }) {
    super(userMessage, opts);
    this.userMessage = userMessage;
    this.status = opts?.status ?? 0;
    this.name = "GatewayError";
  }
}

const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Lightweight wrapper around fetch with a deadline, JSON decode, and
 * uniform error translation.
 *
 * The admin token is attached to every request that targets the
 * /v1/admin/* surface. /healthz and /metrics don't require it.
 */
async function gatewayFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const cfg = getConfig();
  const { auth = true, ...rest } = init;

  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers = new Headers(rest.headers);
  if (auth) headers.set("Authorization", `Bearer ${cfg.adminToken}`);
  headers.set("Accept", "application/json");

  let resp: Response;
  try {
    resp = await fetch(`${cfg.gatewayUrl}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
      // Don't cache between requests; the dashboard wants fresh data.
      cache: "no-store",
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new GatewayError(
        `Gateway timed out after ${REQUEST_TIMEOUT_MS}ms`,
        { cause },
      );
    }
    throw new GatewayError(
      `Could not reach gateway at ${cfg.gatewayUrl}. Is it running?`,
      { cause },
    );
  } finally {
    clearTimeout(deadline);
  }

  if (resp.status === 401 || resp.status === 403) {
    throw new GatewayError(
      "Gateway rejected the admin token. Check INTENTGATE_ADMIN_TOKEN matches the gateway's value.",
      { status: resp.status },
    );
  }
  if (!resp.ok) {
    const body = await safeText(resp);
    throw new GatewayError(
      `Gateway returned HTTP ${resp.status}: ${body || resp.statusText}`,
      { status: resp.status },
    );
  }

  try {
    return (await resp.json()) as T;
  } catch (cause) {
    throw new GatewayError("Gateway returned non-JSON response", { cause });
  }
}

async function safeText(resp: Response): Promise<string> {
  try {
    return (await resp.text()).slice(0, 500);
  } catch {
    return "";
  }
}

/** GET /healthz — used to confirm the gateway is reachable. */
export async function fetchHealth(): Promise<HealthResponse> {
  return gatewayFetch<HealthResponse>("/healthz", { auth: false });
}

/** GET /v1/admin/revocations */
export async function fetchRevocations(
  limit = 100,
  offset = 0,
): Promise<RevocationsResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return gatewayFetch<RevocationsResponse>(
    `/v1/admin/revocations?${params.toString()}`,
  );
}

/** POST /v1/admin/revoke */
export async function revokeToken(
  jti: string,
  reason: string,
): Promise<{ ok: boolean; jti: string }> {
  return gatewayFetch<{ ok: boolean; jti: string }>("/v1/admin/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jti, reason }),
  });
}

/** Inputs for POST /v1/admin/mint. Mirrors the gateway request shape. */
export interface MintOptions {
  subject: string;
  /** Optional issuer override; defaults to the gateway's "intentgate". */
  issuer?: string;
  /** Time-to-live in seconds. 0 / undefined = no expiry caveat. */
  ttlSeconds?: number;
  /** Optional whitelist; agent may only call these tools. */
  tools?: string[];
  /** Optional cap on total calls signed into the chain. */
  maxCalls?: number;
}

/** Successful response from POST /v1/admin/mint. */
export interface MintedToken {
  token: string;
  jti: string;
  subject: string;
  /** RFC3339 timestamp, or empty string when no TTL was requested. */
  expires_at: string;
}

/**
 * POST /v1/admin/mint — issues a fresh capability token signed under
 * the gateway's master key.
 *
 * Returns the encoded token only once; the caller is expected to hand
 * it to the agent immediately (the gateway never stores it server-side
 * in plaintext, only the JTI is recoverable from the audit log).
 */
export async function mintToken(opts: MintOptions): Promise<MintedToken> {
  const body: Record<string, unknown> = { subject: opts.subject };
  if (opts.issuer && opts.issuer.trim() !== "") body.issuer = opts.issuer.trim();
  if (typeof opts.ttlSeconds === "number" && opts.ttlSeconds > 0) {
    body.ttl_seconds = Math.floor(opts.ttlSeconds);
  }
  if (opts.tools && opts.tools.length > 0) {
    body.tools = opts.tools.map((t) => t.trim()).filter((t) => t !== "");
  }
  if (typeof opts.maxCalls === "number" && opts.maxCalls > 0) {
    body.max_calls = Math.floor(opts.maxCalls);
  }
  return gatewayFetch<MintedToken>("/v1/admin/mint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * GET /v1/admin/audit — query the persisted audit log.
 *
 * The gateway only registers this endpoint when audit persistence is
 * enabled (INTENTGATE_AUDIT_PERSIST=true with INTENTGATE_POSTGRES_URL).
 * Older / stdout-only deployments return 404, which surfaces as a
 * GatewayError with status 404; the audit page treats that as
 * "feature not enabled" rather than a hard error.
 */
export async function fetchAudit(
  filter: AuditQueryFilter = {},
): Promise<AuditQueryResponse> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "boolean") {
      if (v) params.set(k, "true");
      continue;
    }
    params.set(k, String(v));
  }
  const query = params.toString();
  const path = query ? `/v1/admin/audit?${query}` : "/v1/admin/audit";
  return gatewayFetch<AuditQueryResponse>(path);
}

/**
 * One agent the gateway has observed, mirroring discovery.ObservedAgent
 * (GET /v1/admin/agents). Passive discovery aggregated from the audit
 * log: the technical truth of what AI is running and what it touches.
 */
export interface ObservedAgent {
  agent_id: string;
  tenant?: string;
  tools: string[];
  risk_signals: string[];
  calls: number;
  blocked: number;
  first_seen: string;
  last_seen: string;
  session_count: number;
}

export interface AgentsResponse {
  agents: ObservedAgent[];
  events_scanned: number;
}

/**
 * GET /v1/admin/agents — passive agent discovery. Registered only when
 * audit persistence is enabled; older gateways return 404, which the
 * page detects to show a "feature not enabled" panel.
 */
export async function fetchAgents(): Promise<AgentsResponse> {
  return gatewayFetch<AgentsResponse>("/v1/admin/agents");
}

/**
 * Returns true if the gateway exposes the /v1/admin/audit endpoint.
 * Cheap probe used by the audit / compliance pages to choose between
 * "live query" and "guidance card / upload fallback" UIs.
 */
export async function isAuditQuerySupported(): Promise<boolean> {
  try {
    await fetchAudit({ limit: 1 });
    return true;
  } catch (err) {
    if (err instanceof GatewayError && err.status === 404) return false;
    if (err instanceof GatewayError && err.status === 503) return false;
    // Anything else (auth, transport) is a real error; surface false
    // here so the UI shows the disabled state. The detail will land in
    // server logs.
    return false;
  }
}

/**
 * Convenience: fetch health + revocations in parallel for the
 * dashboard. Returns partial state (with errors) instead of throwing
 * so the page can render whichever pieces succeeded.
 */
export interface DashboardState {
  health: HealthResponse | null;
  revocations: RevokedToken[];
  errors: { health?: string; revocations?: string };
}

export async function loadDashboardState(): Promise<DashboardState> {
  const [healthRes, revRes] = await Promise.allSettled([
    fetchHealth(),
    fetchRevocations(100, 0),
  ]);

  const errors: DashboardState["errors"] = {};
  let health: HealthResponse | null = null;
  let revocations: RevokedToken[] = [];

  if (healthRes.status === "fulfilled") {
    health = healthRes.value;
  } else {
    errors.health =
      healthRes.reason instanceof GatewayError
        ? healthRes.reason.userMessage
        : String(healthRes.reason);
  }
  if (revRes.status === "fulfilled") {
    revocations = revRes.value.revocations ?? [];
  } else {
    errors.revocations =
      revRes.reason instanceof GatewayError
        ? revRes.reason.userMessage
        : String(revRes.reason);
  }

  return { health, revocations, errors };
}
