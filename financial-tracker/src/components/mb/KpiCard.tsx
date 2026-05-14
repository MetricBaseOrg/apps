import { cn } from "@/lib/utils";
import { Eyebrow } from "./Eyebrow";

export function KpiCard({
  label,
  value,
  delta,
  deltaTone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  className?: string;
}) {
  const toneClass =
    deltaTone === "up"
      ? "text-[var(--color-up)]"
      : deltaTone === "down"
        ? "text-[var(--color-down)]"
        : "text-gray-2";
  return (
    <div className={cn("mb-card p-6 flex flex-col gap-3", className)}>
      <Eyebrow>{label}</Eyebrow>
      <div className="font-sans text-3xl font-extrabold text-white mono">
        {value}
      </div>
      {delta && (
        <div className={cn("font-mono text-xs", toneClass)}>{delta}</div>
      )}
    </div>
  );
}
