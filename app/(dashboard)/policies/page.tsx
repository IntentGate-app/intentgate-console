import { Topbar } from "@/components/topbar";
import { ScrollText } from "lucide-react";

export default function PoliciesPage() {
  return (
    <>
      <Topbar
        title="Policies"
        subtitle="Author and version the Rego policy that gates every authorized call."
      />
      <main className="flex-1 px-8 py-8">
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-zinc-100">
              <ScrollText className="h-5 w-5 text-zinc-700" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Policy editor coming soon
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                In a future release this page will host a Rego authoring view
                with syntax highlighting, dry-run against historical traffic,
                and one-click deploy to the gateway.
              </p>
              <p className="mt-3 text-sm text-zinc-500">
                For now, edit{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
                  internal/policy/default_policy.rego
                </code>{" "}
                in the gateway repo and rebuild, or point{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
                  INTENTGATE_POLICY_FILE
                </code>{" "}
                at a custom Rego file at gateway startup.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
