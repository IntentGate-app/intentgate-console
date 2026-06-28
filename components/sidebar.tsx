"use client";

/**
 * Sidebar navigation. Single client component — every nav item is a
 * Link rendered alongside its active-state class.
 *
 * Rendering this entirely on the client avoids any server/client
 * boundary serialization concerns with the Lucide icon children that
 * were causing the previous server-component split to silently drop
 * navigation events.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  KeyRound,
  ScrollText,
  ListTree,
  Settings,
  Boxes,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: ShieldCheck },
  { href: "/tokens", label: "Tokens", icon: KeyRound },
  { href: "/agents", label: "Agents", icon: Boxes },
  { href: "/policies", label: "Policies", icon: ScrollText },
  { href: "/audit", label: "Audit", icon: ListTree },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-zinc-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            IntentGate
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            const className = active
              ? "flex items-center gap-3 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
              : "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900";

            return (
              <li key={href}>
                <Link href={href} className={className}>
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-zinc-100 px-6 py-4 text-xs text-zinc-500">
        <p className="font-mono">v0.1</p>
        <p className="mt-1">Apache 2.0</p>
      </div>
    </aside>
  );
}
