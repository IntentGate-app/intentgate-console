"use server";

import { revalidatePath } from "next/cache";
import { revokeToken, GatewayError } from "@/lib/gateway";

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
