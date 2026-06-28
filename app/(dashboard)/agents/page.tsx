/**
 * Agent discovery (read-only).
 *
 * Calls GET /v1/admin/agents on the gateway, which aggregates observed
 * audit traffic into the set of AI agents seen, the tools each one
 * calls, and derived risk signals. Registered only when audit
 * persistence is enabled; older / lighter gateways return 404 and the
 * page shows a "feature not enabled" panel.
 *
 * This is the OSS adoption view: see every agent and what it touches,
 * with zero integration. Ownership and policy governance live in the
 * commercial console.
 */

import { Topbar } from "@/components/topbar";
import { ErrorPanel } from "@/components/error-panel";
import { EmptyState } from "@/components/empty-state";
import { fetchAgents, GatewayError, type ObservedAgent } from "@/lib/gateway";
import { Boxes, Database, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const RISK_LABELS: Record<string, string> = {
  payment: "payment / financial",
  "production-data": "production data",
  outbound: "outbound channel",
  "regulated-data": "regulated data",
  "unknown-identity": "unknown identity",
};

export default async function AgentsPage() {
  let agents: ObservedAgent[] = [];
  let featureDisabled = false;
  let errorMsg: string | null = null;

  try {
    const resp = await fetchAgents();
    agents = resp.agents;
  } catch (err) {
    if (err instanceof GatewayError && (err.status === 404 || err.status === 503)) {
      featureDisabled = true;
    } else {
      errorMsg = err instanceof GatewayError ? err.userMessage : String(err);
    }
  }

  const flagged = agents.filter((a) => a.risk_signals.length > 0).length;

  return (
    <>
      <Topbar
        title="Agents"
        subtitle="AI agents discovered from observed gateway traffic."
      />

      <main className="flex-1 space-y-6 px-8 py-8">
        {errorMsg && (
          <ErrorPanel title="Could not load agents" message={errorMsg} />
        )}

        {featureDisabled && (
          <EmptyState
            icon={Database}
            title="Discovery not enabled"
            body="Agent discovery is built from the audit log. Enable audit persistence on the gateway (INTENTGATE_AUDIT_PERSIST=true with a Postgres URL) to see discovered agents here."
          />
        )}

        {!errorMsg && !featureDisabled && agents.length === 0 && (
          <EmptyState
            icon={Boxes}
            title="No agents observed yet"
            body="Once agents call through the gateway, they appear here automatically — no configuration needed."
          />
        )}

        {!errorMsg && !featureDisabled && agents.length > 0 && (
          <>
            <div className="flex gap-4">
              <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <div className="text-2xl font-semibold leading-none">
                  {agents.length}
                </div>
                <div className="text-xs text-zinc-500">Discovered</div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <div className="text-2xl font-semibold leading-none text-amber-600">
                  {flagged}
                </div>
                <div className="text-xs text-zinc-500">Carry risk signals</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Agent</th>
                    <th className="px-4 py-2.5 font-medium">Tools</th>
                    <th className="px-4 py-2.5 font-medium">Risk</th>
                    <th className="px-4 py-2.5 font-medium">Calls</th>
                    <th className="px-4 py-2.5 font-medium">Last seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {agents.map((a, i) => (
                    <tr key={a.agent_id || `unknown-${i}`}>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {a.agent_id || "unknown agent"}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Database className="h-3.5 w-3.5" aria-hidden />
                          {a.tools.slice(0, 3).join(", ") || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {a.risk_signals.length === 0 ? (
                          <span className="text-zinc-400">—</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {a.risk_signals.map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {RISK_LABELS[s] ?? s}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-600">
                        {a.calls}
                        {a.blocked > 0 ? (
                          <span className="text-red-600"> · {a.blocked} blocked</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                        {a.last_seen}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
