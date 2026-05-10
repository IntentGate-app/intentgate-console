/**
 * Audit log viewer.
 *
 * Calls GET /v1/admin/audit on the gateway, which is only registered
 * when audit persistence is enabled (INTENTGATE_AUDIT_PERSIST=true and
 * a Postgres URL is configured). On older / lighter deployments the
 * gateway returns 404 here; the page detects that and shows a
 * "feature not enabled" panel instead of an error.
 *
 * Filters live in the URL search params so refresh / back / share
 * round-trip the operator's view exactly.
 */

import { Topbar } from "@/components/topbar";
import { ErrorPanel } from "@/components/error-panel";
import { EmptyState } from "@/components/empty-state";
import { fetchAudit, GatewayError } from "@/lib/gateway";
import type { AuditEvent, AuditQueryFilter } from "@/lib/types";
import { ListTree, Database, FilterX } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

interface SearchParams {
  from?: string;
  to?: string;
  agent_id?: string;
  tool?: string;
  decision?: string;
  check?: string;
  jti?: string;
  page?: string;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const filter: AuditQueryFilter = {
    // datetime-local inputs submit "YYYY-MM-DDTHH:mm" which isn't
    // RFC3339; normalise to UTC before sending to the gateway.
    from: normaliseInputTime(sp.from),
    to: normaliseInputTime(sp.to),
    agent_id: sp.agent_id || undefined,
    tool: sp.tool || undefined,
    decision: parseDecision(sp.decision),
    check: parseCheck(sp.check),
    jti: sp.jti || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    count: true,
  };

  let events: AuditEvent[] = [];
  let total: number | null = null;
  let error: string | null = null;
  let featureDisabled = false;

  try {
    const resp = await fetchAudit(filter);
    events = resp.events;
    total = typeof resp.total === "number" ? resp.total : null;
  } catch (err) {
    if (err instanceof GatewayError && (err.status === 404 || err.status === 503)) {
      featureDisabled = true;
    } else {
      error = err instanceof GatewayError ? err.userMessage : String(err);
    }
  }

  return (
    <>
      <Topbar
        title="Audit"
        subtitle="Searchable record of every authorization decision the gateway has made."
      />
      <main className="flex-1 space-y-6 px-8 py-8">
        {featureDisabled ? (
          <FeatureDisabledCard />
        ) : (
          <>
            <FilterBar current={sp} />
            {error ? (
              <ErrorPanel title="Could not load audit log" message={error} />
            ) : events.length === 0 ? (
              <EmptyState
                icon={ListTree}
                title="No matching events"
                body={
                  hasAnyFilter(sp)
                    ? "Try widening the filters or the date range."
                    : "Nothing has been recorded yet. Make a tool call to populate the log."
                }
              />
            ) : (
              <>
                <ResultsHeader
                  shownFrom={(page - 1) * PAGE_SIZE + 1}
                  shownTo={(page - 1) * PAGE_SIZE + events.length}
                  total={total}
                />
                <EventsTable events={events} />
                <Pagination
                  current={sp}
                  page={page}
                  hasMore={
                    total !== null
                      ? (page - 1) * PAGE_SIZE + events.length < total
                      : events.length === PAGE_SIZE
                  }
                />
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}

function FeatureDisabledCard() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10">
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-zinc-100">
          <Database className="h-5 w-5 text-zinc-700" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Audit persistence not enabled on this gateway
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            This page lists every <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
              intentgate.tool_call
            </code>{" "}
            event from the gateway&apos;s persistent audit store. Your gateway
            either runs an older release that doesn&apos;t expose{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
              /v1/admin/audit
            </code>{" "}
            or audit persistence is opted out.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            To enable: set{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
              INTENTGATE_AUDIT_PERSIST=true
            </code>{" "}
            on the gateway alongside the existing{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
              INTENTGATE_POSTGRES_URL
            </code>
            . The migration runs on next start.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Until then, tail the gateway logs and grep:
          </p>
          <pre className="mt-2 rounded-md bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100">
{`kubectl -n intentgate logs deploy/intentgate-gateway \\
  | grep '"event":"intentgate.tool_call"'`}
          </pre>
        </div>
      </div>
    </div>
  );
}

function FilterBar({ current }: { current: SearchParams }) {
  const has = hasAnyFilter(current);
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <FilterInput
        label="Agent"
        name="agent_id"
        defaultValue={current.agent_id ?? ""}
        placeholder="agent-id"
      />
      <FilterInput
        label="Tool"
        name="tool"
        defaultValue={current.tool ?? ""}
        placeholder="read_invoice"
      />
      <FilterSelect
        label="Decision"
        name="decision"
        defaultValue={current.decision ?? ""}
        options={[
          { value: "", label: "Any" },
          { value: "allow", label: "Allow" },
          { value: "block", label: "Block" },
        ]}
      />
      <FilterSelect
        label="Check"
        name="check"
        defaultValue={current.check ?? ""}
        options={[
          { value: "", label: "Any" },
          { value: "capability", label: "capability" },
          { value: "intent", label: "intent" },
          { value: "policy", label: "policy" },
          { value: "budget", label: "budget" },
          { value: "upstream", label: "upstream" },
        ]}
      />
      <FilterInput
        label="From (UTC)"
        name="from"
        type="datetime-local"
        defaultValue={toLocalInput(current.from)}
      />
      <FilterInput
        label="To (UTC)"
        name="to"
        type="datetime-local"
        defaultValue={toLocalInput(current.to)}
      />
      <div className="ml-auto flex items-center gap-2">
        {has && (
          <Link
            href="/audit"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <FilterX className="h-3.5 w-3.5" />
            Clear
          </Link>
        )}
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Apply
        </button>
      </div>
    </form>
  );
}

function FilterInput({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
      />
    </label>
  );
}

function FilterSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-zinc-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultsHeader({
  shownFrom,
  shownTo,
  total,
}: {
  shownFrom: number;
  shownTo: number;
  total: number | null;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-base font-semibold tracking-tight">
        Decisions
      </h2>
      <span className="text-sm text-zinc-500">
        {shownFrom}–{shownTo}
        {total !== null ? ` of ${total.toLocaleString()}` : ""}
      </span>
    </div>
  );
}

function EventsTable({ events }: { events: AuditEvent[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Timestamp</th>
            <th className="px-4 py-2.5 font-medium">Decision</th>
            <th className="px-4 py-2.5 font-medium">Check</th>
            <th className="px-4 py-2.5 font-medium">Tool</th>
            <th className="px-4 py-2.5 font-medium">Agent</th>
            <th className="px-4 py-2.5 font-medium">Reason</th>
            <th className="px-4 py-2.5 font-medium text-right">Latency</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {events.map((e, i) => (
            <tr key={`${e.ts}-${i}`} className="hover:bg-zinc-50">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-600">
                {new Date(e.ts).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <DecisionBadge decision={e.decision} />
              </td>
              <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                {e.check || <span className="text-zinc-400">—</span>}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{e.tool}</td>
              <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                {e.agent_id || <span className="text-zinc-400">—</span>}
              </td>
              <td className="px-4 py-3 max-w-md truncate text-zinc-700" title={e.reason ?? ""}>
                {e.reason || <span className="text-zinc-400">—</span>}
              </td>
              <td className="px-4 py-3 text-right font-mono text-xs text-zinc-600">
                {e.latency_ms}ms
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: "allow" | "block" }) {
  const styles =
    decision === "allow"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-rose-50 text-rose-700 ring-rose-200";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles}`}
    >
      {decision}
    </span>
  );
}

function Pagination({
  current,
  page,
  hasMore,
}: {
  current: SearchParams;
  page: number;
  hasMore: boolean;
}) {
  const prevHref = pageHref(current, page - 1);
  const nextHref = pageHref(current, page + 1);
  return (
    <div className="flex items-center justify-end gap-2">
      <PageLink href={prevHref} disabled={page <= 1}>
        Previous
      </PageLink>
      <span className="px-2 text-sm text-zinc-500">Page {page}</span>
      <PageLink href={nextHref} disabled={!hasMore}>
        Next
      </PageLink>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-400">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
    >
      {children}
    </Link>
  );
}

function pageHref(current: SearchParams, page: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v && k !== "page") params.set(k, v);
  }
  if (page > 1) params.set("page", String(page));
  const q = params.toString();
  return q ? `/audit?${q}` : "/audit";
}

function hasAnyFilter(sp: SearchParams): boolean {
  return Boolean(
    sp.from || sp.to || sp.agent_id || sp.tool || sp.decision || sp.check || sp.jti,
  );
}

function parseDecision(v: string | undefined): AuditQueryFilter["decision"] {
  return v === "allow" || v === "block" ? v : undefined;
}

function parseCheck(v: string | undefined): AuditQueryFilter["check"] {
  if (!v) return undefined;
  const allowed = ["capability", "intent", "policy", "budget", "upstream"];
  return allowed.includes(v) ? (v as AuditQueryFilter["check"]) : undefined;
}

/**
 * Convert an ISO datetime to the truncated form the
 * <input type="datetime-local"> control expects ("YYYY-MM-DDTHH:mm").
 * Empty strings round-trip cleanly.
 */
function toLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  // Accept the form already and pass through — the browser is lenient.
  return iso.length >= 16 ? iso.slice(0, 16) : iso;
}

/**
 * Coerce an HTML datetime-local value ("2026-05-09T15:30") to the
 * RFC3339 the gateway expects ("2026-05-09T15:30:00Z"). Treats the
 * value as UTC — the form label warns the operator. Already-RFC3339
 * inputs pass through unchanged.
 */
function normaliseInputTime(v: string | undefined): string | undefined {
  if (!v) return undefined;
  // Already has timezone or seconds — let the gateway parse as-is.
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(v)) return v;
  // "YYYY-MM-DDTHH:mm" → pad seconds + Z.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return v + ":00Z";
  // "YYYY-MM-DDTHH:mm:ss" → just append Z.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)) return v + "Z";
  return v;
}
