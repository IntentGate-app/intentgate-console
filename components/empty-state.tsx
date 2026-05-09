import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  cta?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-8 py-12 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm ring-1 ring-zinc-200">
        <Icon className="h-5 w-5 text-zinc-500" aria-hidden />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-zinc-500">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
