/**
 * Topbar with page title slot + gateway health pill on the right.
 * The page passes its own title; the pill is fetched server-side.
 */

import { fetchHealth, GatewayError } from "@/lib/gateway";
import { CircleCheck, CircleAlert } from "lucide-react";

export async function Topbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  let healthOk = false;
  let version: string | undefined;
  let errorMsg: string | undefined;

  try {
    const h = await fetchHealth();
    healthOk = h.status === "ok";
    version = h.version;
  } catch (err) {
    errorMsg = err instanceof GatewayError ? err.userMessage : String(err);
  }

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
        )}
      </div>

      {healthOk ? (
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
          <CircleCheck className="h-3.5 w-3.5" aria-hidden />
          <span>gateway {version ? `v${version}` : "ok"}</span>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700"
          title={errorMsg}
        >
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          <span>gateway unreachable</span>
        </div>
      )}
    </header>
  );
}
