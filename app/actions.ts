"use server";

import { revalidatePath } from "next/cache";
import {
  revokeToken,
  mintToken,
  GatewayError,
  type MintedToken,
} from "@/lib/gateway";

export interface RevokeFormState {
  ok: boolean;
  message: string;
  jti?: string;
}

/**
 * Server Action invoked from the Tokens page form. Calls the
 * gateway's /v1/admin/revoke and revalidates the page so the new
 * revocation appears in the list immediately.
 *
 * Returns a structured form state instead of throwing — the page
 * uses useActionState (formerly useFormState) to render success or
 * error feedback inline.
 */
export async function revokeFromForm(
  _prev: RevokeFormState,
  formData: FormData,
): Promise<RevokeFormState> {
  const jti = String(formData.get("jti") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!jti) {
    return { ok: false, message: "JTI is required." };
  }

  try {
    await revokeToken(jti, reason);
  } catch (err) {
    const msg = err instanceof GatewayError ? err.userMessage : String(err);
    return { ok: false, message: msg, jti };
  }

  revalidatePath("/tokens");
  revalidatePath("/");
  return { ok: true, message: `Revoked ${jti}.`, jti };
}

export interface MintFormState {
  ok: boolean;
  message: string;
  /** Encoded token, returned only on success — never persisted. */
  token?: string;
  jti?: string;
  subject?: string;
  expiresAt?: string;
}

/**
 * Server Action backing the Mint form on the Tokens page. Calls
 * /v1/admin/mint and returns the encoded token in the form state for
 * one-time display in a copy-to-clipboard panel.
 *
 * The token never enters the browser via any other path: it is not
 * cached, not logged, not stored. The operator copies it once and
 * hands it to the agent out-of-band; if they lose it, they revoke and
 * mint again.
 */
export async function mintFromForm(
  _prev: MintFormState,
  formData: FormData,
): Promise<MintFormState> {
  const subject = String(formData.get("subject") ?? "").trim();
  const ttlRaw = String(formData.get("ttl_seconds") ?? "").trim();
  const toolsRaw = String(formData.get("tools") ?? "").trim();
  const maxCallsRaw = String(formData.get("max_calls") ?? "").trim();

  if (!subject) {
    return { ok: false, message: "Subject (agent ID) is required." };
  }

  let ttlSeconds: number | undefined;
  if (ttlRaw !== "") {
    const n = Number(ttlRaw);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, message: "TTL must be a non-negative number of seconds." };
    }
    ttlSeconds = n;
  }

  let maxCalls: number | undefined;
  if (maxCallsRaw !== "") {
    const n = Number(maxCallsRaw);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, message: "Max calls must be a non-negative integer." };
    }
    maxCalls = Math.floor(n);
  }

  // Tools field is comma- or whitespace-separated. Split on either,
  // trim, drop empties.
  const tools = toolsRaw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t !== "");

  let result: MintedToken;
  try {
    result = await mintToken({
      subject,
      ttlSeconds,
      tools: tools.length > 0 ? tools : undefined,
      maxCalls,
    });
  } catch (err) {
    const msg = err instanceof GatewayError ? err.userMessage : String(err);
    return { ok: false, message: msg };
  }

  // No revalidation needed — minting doesn't change any list the page
  // is reading. (Audit log entries land in stdout / SIEM, not in the
  // Console's data model in v0.1.)
  return {
    ok: true,
    message: `Minted token for ${result.subject}. Copy it now — it won't be shown again.`,
    token: result.token,
    jti: result.jti,
    subject: result.subject,
    expiresAt: result.expires_at || undefined,
  };
}
