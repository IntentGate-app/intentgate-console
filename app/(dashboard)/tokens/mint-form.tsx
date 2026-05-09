"use client";

import { useActionState, useState } from "react";
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
} from "lucide-react";
import { mintFromForm, type MintFormState } from "@/app/actions";

const initialState: MintFormState = { ok: false, message: "" };

/**
 * "Mint a token" form — operator-facing path for issuing a fresh
 * capability to a new agent. Posts to the mintFromForm Server Action;
 * on success the encoded token is rendered ONCE in a copy-to-clipboard
 * panel. The panel makes it visually loud that the value won't be
 * recoverable later.
 *
 * Design notes:
 *   - Subject is required.
 *   - TTL/tools/max-calls are all optional; the gateway encodes each
 *     non-empty input as a signed caveat.
 *   - The token is held only in form state — closing the page or
 *     submitting the form again clears it.
 */
export function MintForm() {
  const [state, formAction, pending] = useActionState(
    mintFromForm,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="mint-subject"
            className="text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            Subject (agent ID) <span className="text-red-500">*</span>
          </label>
          <input
            id="mint-subject"
            name="subject"
            required
            placeholder="finance-copilot-v3"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-zinc-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Anchored into the token via an unforgeable agent-lock caveat.
          </p>
        </div>

        <div>
          <label
            htmlFor="mint-ttl"
            className="text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            TTL (seconds)
          </label>
          <input
            id="mint-ttl"
            name="ttl_seconds"
            type="number"
            min={0}
            step={60}
            placeholder="3600"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Empty or 0 = no expiry caveat.
          </p>
        </div>

        <div>
          <label
            htmlFor="mint-tools"
            className="text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            Tool whitelist
          </label>
          <input
            id="mint-tools"
            name="tools"
            placeholder="read_invoice, list_invoices"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-zinc-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Comma- or space-separated. Empty = no whitelist (any tool).
          </p>
        </div>

        <div>
          <label
            htmlFor="mint-max-calls"
            className="text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            Max calls
          </label>
          <input
            id="mint-max-calls"
            name="max_calls"
            type="number"
            min={0}
            step={1}
            placeholder="100"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Empty or 0 = no per-token budget cap.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          The minted token is shown <strong>once</strong>. Copy it and hand it
          to the agent immediately.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-[38px] items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
        >
          <KeyRound className="h-4 w-4" aria-hidden />
          {pending ? "Minting..." : "Mint token"}
        </button>
      </div>

      {state.message && !state.token && (
        <div
          className={
            state.ok
              ? "flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              : "flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
          }
        >
          {state.ok ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          ) : (
            <AlertCircle className="h-4 w-4" aria-hidden />
          )}
          <span>{state.message}</span>
        </div>
      )}

      {state.ok && state.token && (
        <MintedTokenPanel
          token={state.token}
          jti={state.jti ?? ""}
          subject={state.subject ?? ""}
          expiresAt={state.expiresAt}
        />
      )}
    </form>
  );
}

/**
 * Displays the freshly-minted token with a copy-to-clipboard button
 * and an unmistakable "won't be shown again" warning. The token value
 * is treated like a password: monospace, full-width, no truncation.
 */
function MintedTokenPanel({
  token,
  jti,
  subject,
  expiresAt,
}: {
  token: string;
  jti: string;
  subject: string;
  expiresAt?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Best-effort; some browsers refuse clipboard in non-secure contexts.
    }
  };

  return (
    <div className="space-y-3 rounded-lg border-2 border-amber-300 bg-amber-50/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <ShieldAlert className="h-4 w-4" aria-hidden />
        Minted — copy now, the gateway won&apos;t show this again.
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div>
          <div className="font-medium uppercase tracking-wider text-zinc-500">
            Subject
          </div>
          <div className="mt-0.5 truncate font-mono text-zinc-800">
            {subject}
          </div>
        </div>
        <div>
          <div className="font-medium uppercase tracking-wider text-zinc-500">
            JTI
          </div>
          <div className="mt-0.5 truncate font-mono text-zinc-800">{jti}</div>
        </div>
        <div>
          <div className="font-medium uppercase tracking-wider text-zinc-500">
            Expires
          </div>
          <div className="mt-0.5 truncate font-mono text-zinc-800">
            {expiresAt
              ? new Date(expiresAt).toLocaleString()
              : "never (no TTL)"}
          </div>
        </div>
      </div>

      <div className="relative">
        <textarea
          readOnly
          value={token}
          rows={3}
          aria-label="Minted token"
          className="w-full resize-none rounded-md border border-amber-200 bg-white p-3 pr-12 font-mono text-xs text-zinc-900 focus:border-amber-400 focus:outline-none"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={onCopy}
          className="absolute right-2 top-2 inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-900 px-2.5 text-xs font-medium text-white transition hover:bg-zinc-700"
          aria-label="Copy token to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}
