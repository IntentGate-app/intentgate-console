/**
 * Dashboard — the only screen for the v0.1 console.
 *
 * Server component: fetches dashboard state on every request via the
 * server-only gateway client and renders it as HTML. The admin token
 * never leaves the server. No client-side JS needed for read.
 *
 * Future sessions add interactive bits (revoke button, refresh, mint
 * UI, audit log viewer) as client components or server actions.
 */

import { loadDashboardState } from "@/lib/gateway";

export const dynamic = "force-dynamic"; // never cache; always fresh

export default async function Dashboard() {
  let configError: string | null = null;
  let state: Awaited<ReturnType<typeof loadDashboardState>> | null = null;

  try {
    state = await loadDashboardState();
  } catch (err) {
    configError = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-10 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            IntentGate Console
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Operator UI for the IntentGate authorization gateway.
          </p>
        </div>
        {state?.health ? (
          <HealthPill version={state.health.version} />
        ) : (
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            gateway: unreachable
          </span>
        )}
      </header>

      {configError && <ConfigErrorPanel message={configError} />}

      {state && !configError && (
        <>
          {state.errors.revocations ? (
            <ErrorPanel
              title="Could not load revocations"
              message={state.errors.revocations}
            />
          ) : (
            <RevocationsTable revocations={state.revocations} />
          )}
        </>
      )}
    </main>
  );
}

function HealthPill({ version }: { version?: string }) {
  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
      gateway: {version ? `v${version}` : "ok"}
    </span>
  );
}

function ConfigErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-sm font-semibold text-amber-900">
        Configuration required
      </h2>
      <p className="mt-2 text-sm text-amber-800">{message}</p>
      <p className="mt-4 text-xs text-amber-700">
        Copy <code className="rounded bg-amber-100 px-1">.env.example</code> to{" "}
        <code className="rounded bg-amber-100 px-1">.env.local</code> and fill
        in the values, then restart <code>npm run dev</code>.
      </p>
    </div>
  );
}

function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="text-sm font-semibold text-red-900">{title}</h2>
      <p className="mt-2 text-sm text-red-800">{message}</p>
    </div>
  );
}

function RevocationsTable({
  revocations,
}: {
  revocations: { jti: string; revoked_at: string; reason: string }[];
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Revoked tokens</h2>
        <span className="text-sm text-zinc-500">
          {revocations.length} total
        </span>
      </div>

      {revocations.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-10 text-center">
          <p className="text-sm text-zinc-600">No revocations yet.</p>
          <p className="mt-2 text-xs text-zinc-500">
            Revoke a token via{" "}
            <code className="rounded bg-zinc-200 px-1">igctl revoke</code> or
            the Mint UI (coming soon).
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">JTI</th>
                <th className="px-4 py-2 font-medium">Revoked at</th>
                <th className="px-4 py-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {revocations.map((r) => (
                <tr key={r.jti}>
                  <td className="px-4 py-3 font-mono text-xs">{r.jti}</td>
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
      )}
    </section>
  );
}
