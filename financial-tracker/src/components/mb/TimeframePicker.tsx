"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { DashboardPeriod } from "@/lib/periods";
import { PERIOD_LABELS } from "@/lib/periods";

const PERIODS = Object.keys(PERIOD_LABELS) as DashboardPeriod[];

export function TimeframePicker({ current }: { current: DashboardPeriod }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(p: DashboardPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", p);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-px bg-line border border-line">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => select(p)}
          className={[
            "font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 transition-colors",
            p === current
              ? "bg-gold text-black font-bold"
              : "bg-bg-card text-gray-2 hover:text-gold hover:bg-bg-hover",
          ].join(" ")}
        >
          {p === "mtd" ? "MTD" : p === "ytd" ? "YTD" : p.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
