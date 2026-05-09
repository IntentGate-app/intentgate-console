/**
 * Settings page. v0.1: read-only display of how the console is wired
 * to the gateway. Future: writable settings (default revocation
 * reason, theme, role-based assignments) once auth lands.
 */

import { Topbar } from "@/components/topbar";
import { Settings as SettingsIcon, Server, KeyRound, Activity } from "lucide-react";
import { getConfig } from "@/lib/config";

export default function SettingsPage() {
  let gatewayUrl = "(not configured)";
  let tokenSet = false;

  try {
    const cfg = getConfig();
    gatewayUrl = cfg.gatewayUrl;
    tokenSet = cfg.adminToken.length > 0;
  } catch {
    // getConfig throws on missing env; the topbar will already show
    // the error via the health-check failure.
  }

  return (
    <>
      <Topbar
        title="Settings"
        subtitle="How this console is wired to the gateway."
      />
      <main className="flex-1 px-8 py-8">
        <div className="max-w-2xl space-y-6">
          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Server className="h-4 w-4 text-zinc-500" aria-hidden />
              <h2 className="text-sm font-semibold tracking-tight">
                Gateway connection
              </h2>
            </div>
            <KeyValueRow
              label="Gateway URL"
              value={
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">
                  {gatewayUrl}
                </code>
              }
            />
            <KeyValueRow
              label="Admin token"
              value={
                tokenSet ? (
                  <span className="text-emerald-700">configured</span>
                ) : (
                  <span className="text-red-700">not set</span>
                )
              }
            />
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-zinc-500" aria-hidden />
              <h2 className="text-sm font-semibold tracking-tight">
                Authentication
              </h2>
            </div>
            <p className="text-sm text-zinc-600">
              The console uses a static admin token stored server-side.
              OIDC/SSO and role-based access control are part of the commercial
              <code className="mx-1 rounded bg-zinc-100 px-1 font-mono text-xs">
                console-enterprise
              </code>
              overlay.
            </p>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-zinc-500" aria-hidden />
              <h2 className="text-sm font-semibold tracking-tight">
                Data sources
              </h2>
            </div>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li>
                <span className="font-medium">Health</span> — GET{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
                  /healthz
                </code>
              </li>
              <li>
                <span className="font-medium">Metrics</span> — GET{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
                  /metrics
                </code>{" "}
                (requires{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
                  INTENTGATE_METRICS_ENABLED=true
                </code>
                )
              </li>
              <li>
                <span className="font-medium">Revocations</span> — GET{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
                  /v1/admin/revocations
                </code>
              </li>
              <li>
                <span className="font-medium">Revoke</span> — POST{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
                  /v1/admin/revoke
                </code>
              </li>
            </ul>
          </section>

          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <SettingsIcon className="h-3.5 w-3.5" aria-hidden />
            Settings are read-only in v0.1. Configure via env vars on the
            console process and restart.
          </p>
        </div>
      </main>
    </>
  );
}

function KeyValueRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b border-zinc-100 py-2 last:border-b-0">
      <dt className="text-sm text-zinc-600">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
