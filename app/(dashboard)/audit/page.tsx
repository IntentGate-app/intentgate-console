import { Topbar } from "@/components/topbar";
import { ListTree } from "lucide-react";

export default function AuditPage() {
  return (
    <>
      <Topbar
        title="Audit"
        subtitle="Searchable log of every authorization decision the gateway has made."
      />
      <main className="flex-1 px-8 py-8">
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-zinc-100">
              <ListTree className="h-5 w-5 text-zinc-700" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Audit log viewer coming soon
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                In a future release this page will host a searchable,
                filterable view of every <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
                  intentgate.tool_call
                </code>{" "}
                event — by agent, tool, decision, check, time range — with a
                detail panel showing the full event payload.
              </p>
              <p className="mt-3 text-sm text-zinc-500">
                Today the gateway emits one structured JSON line per decision
                to stdout. Tail the gateway logs and grep:
              </p>
              <pre className="mt-2 rounded-md bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100">
{`kubectl -n intentgate logs deploy/intentgate-gateway \\
  | grep '"event":"intentgate.tool_call"'`}
              </pre>
              <p className="mt-3 text-sm text-zinc-500">
                Persisting audit events to the same Postgres used for
                revocation is the prerequisite for this viewer.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
