import { Sidebar } from "@/components/sidebar";
import type { ReactNode } from "react";

/**
 * Shared shell for every "real" page in the console: sidebar nav on
 * the left, page content on the right. The Topbar is rendered per-page
 * since each page has its own title + subtitle.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">{children}</div>
    </div>
  );
}
