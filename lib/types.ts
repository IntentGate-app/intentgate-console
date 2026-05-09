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
