/**
 * Tokens page. v0.1 surface:
 *
 *   - "Revoke a JTI" form (calls revokeFromForm Server Action)
 *   - List of currently revoked tokens
 *
 * Future: list of currently *active* tokens once the gateway gains a
 * /v1/admin/tokens endpoint, plus a Mint form once the gateway gains
 * /v1/admin/mint. Both are gateway-side additions — out of scope for
 * this session.
 */

import { Topbar } from "@/components/topbar";
import { ErrorPanel } from "@/components/error-panel";
import { EmptyState } from "@/components/empty-state";
import { fetchRevocations, GatewayError } from "@/lib/gateway";
import { ListX } from "lucide-react";
import { RevokeForm } from "./revoke-form";

export const dynamic = "force-dynamic";

export default async function TokensPage() {
  let revocations = [] as Awaited<ReturnType<typeof fetchRevocations>>["revocations"];
  let error: string | null = null;

  try {
    const r = await fetchRevocations(100, 0);
    revocations = r.revocations;
  } catch (err) {
    error = err instanceof GatewayError ? err.userMessage : String(err);
  }

  return (
    <>
      <Topbar
        title="Tokens"
        subtitle="Revoke leaked tokens and review the deny list."
      />

      <main className="flex-1 space-y-8 px-8 py-8">
        <section>
          <h2 className="mb-3 text-base font-semibold tracking-tight">
            Revoke a token
          </h2>
          <RevokeForm />
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Currently revoked
            </h2>
            <span className="text-sm text-zinc-500">
              {revocations.length} total
            </span>
          </div>

          {error ? (
            <ErrorPanel
              title="Could not load revocations"
              message={error}
            />
          ) : revocations.length === 0 ? (
            <EmptyState
              icon={ListX}
              title="No revocations yet"
              body="Use the form above or igctl revoke to invalidate a token."
            />
          ) : (
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
      </main>
    </>
  );
}
