/**
 * Tiny Prometheus text-format parser.
 *
 * Pulls out the specific metrics the dashboard cares about. Not a
 * general-purpose parser — only handles the subset of the Prometheus
 * exposition format the gateway actually emits (counters, histograms
 * with `le=` buckets, no exemplars, no native histograms).
 *
 * Returns a `MetricsSnapshot` shaped for direct consumption by the
 * stats cards. Missing metrics return zero / empty arrays rather
 * than throwing — a freshly-started gateway has zero data and the
 * dashboard should still render.
 */

import "server-only";

import { getConfig } from "@/lib/config";

export interface CheckCounts {
  allow: number;
  block: number;
  skip: number;
}

export interface MetricsSnapshot {
  /**
   * Total tools/call requests across all decisions. Sum of every
   * value of intentgate_gateway_check_decisions_total{check="capability",...}
   * since the capability check is always evaluated first.
   */
  totalToolCalls: number;
  /** Allow rate as a fraction in [0, 1], or null when no data. */
  allowRate: number | null;
  /** Per-check breakdown. Keys: capability, intent, policy, budget, upstream. */
  checks: Record<string, CheckCounts>;
  /** Top check that's blocking the most: name + count. null when no blocks. */
  topBlocker: { check: string; count: number } | null;
  /**
   * p95 of http_request_duration_seconds for the /v1/mcp route, in ms.
   * Computed from histogram buckets via simple linear interpolation.
   * null when no data.
   */
  p95LatencyMs: number | null;
}

const REQUEST_TIMEOUT_MS = 5_000;

export async function fetchMetricsSnapshot(): Promise<MetricsSnapshot | null> {
  const cfg = getConfig();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);

  let text = "";
  try {
    const resp = await fetch(`${cfg.gatewayUrl}/metrics`, {
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!resp.ok) return null;
    text = await resp.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }

  return parseSnapshot(text);
}

/** Exported for testing; takes raw Prometheus text and returns the snapshot. */
export function parseSnapshot(text: string): MetricsSnapshot {
  const lines = text.split("\n");

  const checks: Record<string, CheckCounts> = {};
  const histogramBuckets: Record<string, [number, number][]> = {};
  const histogramCount: Record<string, number> = {};

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    // intentgate_gateway_check_decisions_total{check="capability",decision="skip"} 12
    const checkMatch = line.match(
      /^intentgate_gateway_check_decisions_total\{check="([^"]+)",decision="([^"]+)"\}\s+([\d.eE+-]+)/,
    );
    if (checkMatch) {
      const [, check, decision, valueStr] = checkMatch;
      const value = Number(valueStr);
      if (!Number.isFinite(value)) continue;
      checks[check] ??= { allow: 0, block: 0, skip: 0 };
      if (decision === "allow" || decision === "block" || decision === "skip") {
        checks[check][decision] = value;
      }
      continue;
    }

    // intentgate_gateway_http_request_duration_seconds_bucket{method="POST",route="/v1/mcp",le="0.001"} 1
    const bucketMatch = line.match(
      /^intentgate_gateway_http_request_duration_seconds_bucket\{method="POST",route="\/v1\/mcp",le="([^"]+)"\}\s+([\d.eE+-]+)/,
    );
    if (bucketMatch) {
      const [, leStr, valueStr] = bucketMatch;
      const le = leStr === "+Inf" ? Number.POSITIVE_INFINITY : Number(leStr);
      const v = Number(valueStr);
      if (Number.isFinite(v)) {
        histogramBuckets["mcp"] ??= [];
        histogramBuckets["mcp"].push([le, v]);
      }
      continue;
    }

    // intentgate_gateway_http_request_duration_seconds_count{method="POST",route="/v1/mcp"} 1
    const countMatch = line.match(
      /^intentgate_gateway_http_request_duration_seconds_count\{method="POST",route="\/v1\/mcp"\}\s+([\d.eE+-]+)/,
    );
    if (countMatch) {
      histogramCount["mcp"] = Number(countMatch[1]);
      continue;
    }
  }

  // Total tool calls: sum across capability check decisions (the
  // first stage; every request that reaches /v1/mcp tools/call hits it).
  const cap = checks["capability"];
  const totalToolCalls = cap ? cap.allow + cap.block + cap.skip : 0;

  // Allow rate: fraction of upstream allows over total tool calls.
  // If upstream isn't seen yet, fall back to capability allow rate.
  let allowRate: number | null = null;
  if (totalToolCalls > 0) {
    const upstream = checks["upstream"];
    if (upstream && upstream.allow + upstream.block > 0) {
      allowRate = upstream.allow / (upstream.allow + upstream.block);
    } else {
      // No upstream activity: treat any call that reached this point
      // as "allowed by the gateway" (block at one of the four checks
      // is the only way to fail).
      const blocked = Object.values(checks).reduce(
        (acc, c) => acc + c.block,
        0,
      );
      allowRate = (totalToolCalls - blocked) / totalToolCalls;
    }
  }

  // Top blocker: which check has the highest block count?
  let topBlocker: MetricsSnapshot["topBlocker"] = null;
  for (const [name, c] of Object.entries(checks)) {
    if (c.block <= 0) continue;
    if (!topBlocker || c.block > topBlocker.count) {
      topBlocker = { check: name, count: c.block };
    }
  }

  const p95LatencyMs = computeP95(
    histogramBuckets["mcp"] ?? [],
    histogramCount["mcp"] ?? 0,
  );

  return {
    totalToolCalls,
    allowRate,
    checks,
    topBlocker,
    p95LatencyMs,
  };
}

/**
 * Linear interpolation of the 95th percentile from cumulative buckets.
 * Returns ms (rounded). null when there's no data.
 *
 * Cumulative buckets per Prometheus convention: the count at `le=X`
 * is the number of observations at most X seconds. The +Inf bucket
 * holds the full count.
 */
function computeP95(
  buckets: [number, number][],
  total: number,
): number | null {
  if (total <= 0 || buckets.length === 0) return null;
  // Sort by le ascending (Prom usually emits them sorted, defensive).
  const sorted = [...buckets].sort((a, b) => a[0] - b[0]);
  const target = total * 0.95;

  let prevLe = 0;
  let prevCount = 0;
  for (const [le, count] of sorted) {
    if (count >= target) {
      if (le === Number.POSITIVE_INFINITY) {
        // All observations beyond a finite bucket: fall back to the
        // last finite le we saw.
        return Math.round(prevLe * 1000);
      }
      const span = count - prevCount;
      const offset = target - prevCount;
      const fraction = span > 0 ? offset / span : 0;
      const seconds = prevLe + (le - prevLe) * fraction;
      return Math.round(seconds * 1000);
    }
    prevLe = le === Number.POSITIVE_INFINITY ? prevLe : le;
    prevCount = count;
  }
  // Shouldn't reach here if +Inf bucket exists and total matches; defensive.
  return null;
}
