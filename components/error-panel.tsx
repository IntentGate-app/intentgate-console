import { AlertTriangle } from "lucide-react";

export function ErrorPanel({
  title,
  message,
  variant = "red",
}: {
  title: string;
  message: string;
  variant?: "red" | "amber";
}) {
  const wrap =
    variant === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-red-200 bg-red-50 text-red-900";
  const icon = variant === "amber" ? "text-amber-600" : "text-red-600";

  return (
    <div className={`rounded-lg border p-5 ${wrap}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`}
          aria-hidden
        />
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-sm opacity-90">{message}</p>
        </div>
      </div>
    </div>
  );
}
