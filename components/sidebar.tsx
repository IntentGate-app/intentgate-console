/**
 * Sidebar navigation. Server component with a small client island
 * (NavLink) for active-state highlighting via usePathname.
 */

import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  ScrollText,
  ListTree,
  Settings,
} from "lucide-react";
import { NavLink } from "@/components/nav-link";

const navItems = [
  { href: "/", label: "Dashboard", icon: ShieldCheck },
  { href: "/tokens", label: "Tokens", icon: KeyRound },
  { href: "/policies", label: "Policies", icon: ScrollText },
  { href: "/audit", label: "Audit", icon: ListTree },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
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
          {navItems.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <NavLink href={href}>
                <Icon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-zinc-100 px-6 py-4 text-xs text-zinc-500">
        <p className="font-mono">v0.1</p>
        <p className="mt-1">Apache 2.0</p>
      </div>
    </aside>
  );
}
