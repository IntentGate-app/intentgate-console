/**
 * Shared types mirroring the gateway's admin API.
 *
 * Keep these in sync with internal/revocation/store.go in the gateway
 * repo. Field names match the JSON wire shape.
 */

export interface RevokedToken {
  jti: string;
  revoked_at: string; // RFC 3339 timestamp
  reason: string;
}

export interface RevocationsResponse {
  revocations: RevokedToken[];
  limit: number;
  offset: number;
}

export interface HealthResponse {
  status: string;
  version?: string;
}

/**
 * One audit event as returned by GET /v1/admin/audit.
 *
 * Mirrors gateway/internal/audit/audit.go (schema_version "1"). All
 * optional fields default to the empty string / 0 on the wire so we
 * type them as required + nullable rather than optional, to keep the
 * UI's "value present" check trivial.
 */
export interface AuditEvent {
  ts: string;
  event: string;
  schema_version: string;
  decision: "allow" | "block";
  check?: "" | "capability" | "intent" | "policy" | "budget" | "upstream";
  reason?: string;
  agent_id?: string;
  session_id?: string;
  tool: string;
  arg_keys?: string[];
  capability_token_id?: string;
  intent_summary?: string;
  latency_ms: number;
  remote_ip?: string;
  upstream_status?: number;
}

export interface AuditQueryResponse {
  events: AuditEvent[];
  limit: number;
  offset: number;
  total?: number;
}

/** Filter accepted by the /v1/admin/audit endpoint. */
export interface AuditQueryFilter {
  from?: string;
  to?: string;
  agent_id?: string;
  tool?: string;
  decision?: "allow" | "block";
  check?: AuditEvent["check"];
  jti?: string;
  limit?: number;
  offset?: number;
  count?: boolean;
}
