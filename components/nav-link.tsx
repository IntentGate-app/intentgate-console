"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Sidebar nav link with active-state highlighting. Active when the
 * current pathname starts with `href` (so /tokens/abc highlights the
 * Tokens link). Root `/` only matches exactly to avoid lighting up
 * Dashboard for every page.
 */
export function NavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const className = active
    ? "flex items-center gap-3 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
    : "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
