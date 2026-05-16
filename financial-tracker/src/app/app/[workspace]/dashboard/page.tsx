import Link from "next/link";
import { requireMembership } from "@/server/workspace";
import { Eyebrow } from "@/components/mb/Eyebrow";
import { KpiCard } from "@/components/mb/KpiCard";
import { BunEmpty } from "@/components/mb/BunEmpty";
import { Money } from "@/components/mb/Money";
import { CashflowBar } from "@/components/charts/CashflowBar";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { SankeyChart } from "@/components/charts/SankeyChart";
import { TimeframePicker } from "@/components/mb/TimeframePicker";
import { buildDashboard } from "@/server/analytics";
import { PERIOD_LABELS } from "@/lib/periods";
import type { DashboardPeriod } from "@/lib/periods";

const VALID_PERIODS = new Set(["mtd", "3m", "6m", "ytd", "1y"]);

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { workspace: slug } = await params;
  const { period: rawPeriod } = await searchParams;
  const period: DashboardPeriod = VALID_PERIODS.has(rawPeriod ?? "") ? (rawPeriod as DashboardPeriod) : "mtd";

  const { workspace } = await requireMembership(slug);
  const data = await buildDashboard(workspace.id, period);

  const cashflowSign = parseFloat(data.cashflowMtd) >= 0 ? "up" : "down";
  const momDelta =
    data.monthOverMonth !== null
      ? `${data.monthOverMonth >= 0 ? "▲" : "▼"} ${Math.abs(data.monthOverMonth).toFixed(1)}% vs last mo`
      : "First month with data";
  const momTone =
    data.monthOverMonth === null
      ? "neutral"
      : data.monthOverMonth >= 0
        ? "up"
        : "down";

  return (
    <div className="flex flex-col gap-8 max-w-[1240px]">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-2">
            <Eyebrow>Dashboard · {workspace.type}</Eyebrow>
            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-white break-words">
              {workspace.name}
            </h1>
            <p className="font-mono text-xs text-gray-3 uppercase tracking-[0.2em]">
              Base · {workspace.baseCurrency}
            </p>
          </div>
          <TimeframePicker current={period} />
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[var(--color-line)]">
        <KpiCard
          label={`Cashflow · ${PERIOD_LABELS[period]}`}
          value={<Money value={data.cashflowMtd} currency={workspace.baseCurrency} />}
          delta={momDelta}
          deltaTone={momTone}
        />
        <KpiCard
          label="Income · MTD"
          value={<Money value={data.incomeMtd} currency={workspace.baseCurrency} />}
          delta={cashflowSign === "up" ? "▲ Inflow" : "—"}
          deltaTone="up"
        />
        <KpiCard
          label="Expense · MTD"
          value={<Money value={data.expenseMtd} currency={workspace.baseCurrency} />}
          delta="▼ Outflow"
          deltaTone="down"
        />
      </div>

      <div className="grid md:grid-cols-[1.6fr_1fr] gap-px bg-[var(--color-line)]">
        <div className="mb-card p-6 flex flex-col gap-4">
          <Eyebrow>Cashflow · {PERIOD_LABELS[period]}</Eyebrow>
          <CashflowBar
            data={data.cashflowByMonth}
            currency={workspace.baseCurrency}
          />
        </div>
        <div className="mb-card p-6 flex flex-col gap-4">
          <Eyebrow>Expense mix · {PERIOD_LABELS[period]}</Eyebrow>
          <CategoryDonut
            data={data.categoryBreakdown}
            currency={workspace.baseCurrency}
          />
          {data.categoryBreakdown.length > 0 && (
            <ul className="flex flex-col gap-1 mt-2">
              {data.categoryBreakdown.slice(0, 5).map((c) => (
                <li
                  key={c.name}
                  className="flex justify-between text-xs font-mono"
                >
                  <span className="text-gray-2">{c.name}</span>
                  <span className="text-white mono">
                    <Money value={c.value} currency={workspace.baseCurrency} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mb-card p-6 flex flex-col gap-4">
        <Eyebrow>Money flow · {PERIOD_LABELS[period]}</Eyebrow>
        <SankeyChart
          sources={data.sankey.sources}
          sinks={data.sankey.sinks}
          currency={workspace.baseCurrency}
        />
      </div>

      <div className="mb-card p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <Eyebrow>Recent transactions</Eyebrow>
          <Link
            href={`/app/${slug}/transactions`}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold hover:text-gold-bright"
          >
            View all →
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <BunEmpty
            title="Your books are empty"
            description="Add an account, then record a transaction."
            action={
              <Link
                href={`/app/${slug}/transactions`}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:text-gold-bright"
              >
                → Start ledger
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col">
            {data.recent.map((t) => {
              const tone =
                t.type === "INCOME"
                  ? "text-[var(--color-up)]"
                  : t.type === "EXPENSE"
                    ? "text-[var(--color-down)]"
                    : "text-gray-1";
              const sign =
                t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : "↔";
              return (
                <div
                  key={t.id}
                  className="py-2.5 border-b border-line last:border-b-0 text-sm"
                >
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[100px_1fr_180px_140px] items-center">
                    <span className="font-mono text-xs text-gray-2">
                      {t.date.toISOString().slice(0, 10)}
                    </span>
                    <span className="text-white truncate">
                      {t.memo || t.category?.name || "—"}
                    </span>
                    <span className="font-mono text-xs text-gray-3 truncate">
                      {t.finAccount.name}
                      {t.counterAccount ? ` → ${t.counterAccount.name}` : ""}
                    </span>
                    <span className={`mono text-sm text-right ${tone}`}>
                      {sign}{" "}
                      <Money value={t.amount.toString()} currency={t.currency} />
                    </span>
                  </div>
                  {/* Mobile card */}
                  <div className="md:hidden flex flex-col gap-1">
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-white truncate flex-1 min-w-0">
                        {t.memo || t.category?.name || "—"}
                      </span>
                      <span className={`mono text-sm shrink-0 ${tone}`}>
                        {sign}{" "}
                        <Money value={t.amount.toString()} currency={t.currency} />
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="font-mono text-[10px] text-gray-3 uppercase tracking-[0.15em]">
                        {t.date.toISOString().slice(0, 10)}
                      </span>
                      <span className="font-mono text-[10px] text-gray-3 truncate text-right">
                        {t.finAccount.name}
                        {t.counterAccount ? ` → ${t.counterAccount.name}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
