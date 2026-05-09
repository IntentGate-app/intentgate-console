/**
 * Dashboard — the landing page. Shows live stats from the gateway's
 * /metrics endpoint plus the current revocations table.
 *
 * All fetches happen in parallel via Promise.allSettled so a slow or
 * failed metrics scrape doesn't block the revocations list (and vice
 * versa). Each section renders its own error state.
 */

import {
  Activity,
  CheckCircle2,
  ShieldAlert,
  Timer,
  ListX,
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import { ErrorPanel } from "@/components/error-panel";
import { EmptyState } from "@/components/empty-state";
import { fetchRevocations, GatewayError } from "@/lib/gateway";
import { fetchMetricsSnapshot } from "@/lib/metrics-parser";
import type { RevokedToken } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [metricsRes, revRes] = await Promise.allSettled([
    fetchMetricsSnapshot(),
    fetchRevocations(100, 0),
  ]);

  const metrics =
    metricsRes.status === "fulfilled" ? metricsRes.value : null;
  const revocations =
    revRes.status === "fulfilled" ? revRes.value.revocations : [];
  const revError =
    revRes.status === "rejected"
      ? revRes.reason instanceof GatewayError
        ? revRes.reason.userMessage
        : String(revRes.reason)
      : null;

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Live gateway state and recent activity."
      />

      <main className="flex-1 space-y-8 px-8 py-8">
        <StatsRow metrics={metrics} revocationCount={revocations.length} />

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Revoked tokens
            </h2>
            <span className="text-sm text-zinc-500">
              {revocations.length} total
            </span>
          </div>
          {revError ? (
            <ErrorPanel
              title="Could not load revocations"
              message={revError}
            />
          ) : revocations.length === 0 ? (
            <EmptyState
              icon={ListX}
              title="No revocations yet"
              body="Use igctl revoke or the Tokens page to invalidate a leaked token."
            />
          ) : (
            <RevocationsTable revocations={revocations} />
          )}
        </section>
      </main>
    </>
  );
}

function StatsRow({
  metrics,
  revocationCount,
}: {
  metrics: Awaited<ReturnType<typeof fetchMetricsSnapshot>>;
  revocationCount: number;
}) {
  if (!metrics) {
    return (
      <ErrorPanel
        title="Live metrics unavailable"
        message="Set INTENTGATE_METRICS_ENABLED=true on the gateway to surface live counters here."
        variant="amber"
      />
    );
  }

  const allowPct =
    metrics.allowRate === null
      ? "—"
      : `${(metrics.allowRate * 100).toFixed(1)}%`;
  const allowVariant =
    metrics.allowRate === null
      ? "default"
      : metrics.allowRate >= 0.95
        ? "good"
        : metrics.allowRate >= 0.7
          ? "warn"
          : "bad";

  const blockerHint = metrics.topBlocker
    ? `${metrics.topBlocker.count} block${metrics.topBlocker.count === 1 ? "" : "s"}`
    : "no blocks observed";

  const p95 = metrics.p95LatencyMs === null ? "—" : `${metrics.p95LatencyMs}ms`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Tool calls"
        value={metrics.totalToolCalls.toLocaleString()}
        hint="since gateway start"
        icon={Activity}
      />
      <StatCard
        label="Allow rate"
        value={allowPct}
        hint={
          metrics.allowRate === null
            ? "no traffic yet"
            : "across all checks + upstream"
        }
        icon={CheckCircle2}
        variant={allowVariant}
      />
      <StatCard
        label="Top blocker"
        value={metrics.topBlocker?.check ?? "—"}
        hint={blockerHint}
        icon={ShieldAlert}
        variant={metrics.topBlocker ? "warn" : "default"}
      />
      <StatCard
        label="p95 latency"
        value={p95}
        hint={`/v1/mcp end-to-end`}
        icon={Timer}
      />
      <StatCard
        label="Revoked tokens"
        value={revocationCount.toLocaleString()}
        hint="currently in the deny list"
        icon={ListX}
        variant={revocationCount > 0 ? "warn" : "default"}
      />
    </div>
  );
}

function RevocationsTable({ revocations }: { revocations: RevokedToken[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">JTI</th>
            <th className="px-4 py-2.5 font-medium">Revoked at</th>
            <th className="px-4 py-2.5 font-medium">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {revocations.map((r) => (
            <tr key={r.jti} className="hover:bg-zinc-50">
              <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                {r.jti}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                {new Date(r.revoked_at).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-zinc-700">
                {r.reason || (
                  <span className="text-zinc-400">(no reason)</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
