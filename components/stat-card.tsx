/**
 * One stat card on the dashboard. Compact, no-frills metric display.
 *
 * Variants:
 *   default: zinc text + zinc background
 *   good:    emerald (allow-rate, healthy)
 *   warn:    amber (high block rate, latency above threshold)
 *   bad:     red (blocked outright, errors)
 */

import type { LucideIcon } from "lucide-react";

export type StatVariant = "default" | "good" | "warn" | "bad";

const variantClasses: Record<StatVariant, { wrap: string; icon: string }> = {
  default: { wrap: "bg-white border-zinc-200", icon: "text-zinc-500" },
  good: { wrap: "bg-emerald-50 border-emerald-200", icon: "text-emerald-600" },
  warn: { wrap: "bg-amber-50 border-amber-200", icon: "text-amber-600" },
  bad: { wrap: "bg-red-50 border-red-200", icon: "text-red-600" },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  variant?: StatVariant;
}) {
  const v = variantClasses[variant];
  return (
    <div className={`rounded-lg border p-5 ${v.wrap}`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <Icon className={`h-5 w-5 ${v.icon}`} aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
