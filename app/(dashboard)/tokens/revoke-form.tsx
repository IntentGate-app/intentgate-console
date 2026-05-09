"use client";

import { useActionState } from "react";
import { Ban, CheckCircle2, AlertCircle } from "lucide-react";
import { revokeFromForm, type RevokeFormState } from "@/app/actions";

const initialState: RevokeFormState = { ok: false, message: "" };

/**
 * "Revoke a JTI" form — pasted JTI + optional reason → posts to the
 * revokeFromForm Server Action. Inline success/error feedback via
 * useActionState; the page revalidates on success so the new
 * revocation appears in the list below.
 */
export function RevokeForm() {
  const [state, formAction, pending] = useActionState(
    revokeFromForm,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border border-zinc-200 bg-white p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label
            htmlFor="jti"
            className="text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            JTI
          </label>
          <input
            id="jti"
            name="jti"
            required
            placeholder="01HX..."
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-zinc-900 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="reason"
            className="text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            Reason
          </label>
          <input
            id="reason"
            name="reason"
            placeholder="leaked in PR comment"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-[38px] items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
          >
            <Ban className="h-4 w-4" aria-hidden />
            {pending ? "Revoking..." : "Revoke"}
          </button>
        </div>
      </div>

      {state.message && (
        <div
          className={
            state.ok
              ? "mt-4 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              : "mt-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
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

      <p className="mt-3 text-xs text-zinc-500">
        Revocation is idempotent. Re-revoking the same JTI updates the reason
        but keeps the original timestamp.
      </p>
    </form>
  );
}
