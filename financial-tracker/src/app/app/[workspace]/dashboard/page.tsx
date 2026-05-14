import Link from "next/link";
import { requireMembership } from "@/server/workspace";
import { Eyebrow } from "@/components/mb/Eyebrow";
import { KpiCard } from "@/components/mb/KpiCard";
import { BunEmpty } from "@/components/mb/BunEmpty";
import { Money } from "@/components/mb/Money";
import { CashflowBar } from "@/components/charts/CashflowBar";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { buildDashboard } from "@/server/analytics";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace } = await requireMembership(slug);
  const data = await buildDashboard(workspace.id);

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
      <header className="flex flex-col gap-2">
        <Eyebrow>Dashboard · {workspace.type}</Eyebrow>
        <h1 className="font-sans text-3xl font-extrabold text-white">
          {workspace.name}
        </h1>
        <p className="font-mono text-xs text-gray-3 uppercase tracking-[0.2em]">
          Base · {workspace.baseCurrency}
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-px bg-[var(--color-line)]">
        <KpiCard
          label="Cashflow · MTD"
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
          <Eyebrow>Cashflow · last 6 months</Eyebrow>
          <CashflowBar
            data={data.cashflowByMonth}
            currency={workspace.baseCurrency}
          />
        </div>
        <div className="mb-card p-6 flex flex-col gap-4">
          <Eyebrow>Expense mix · MTD</Eyebrow>
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
                  className="grid grid-cols-[100px_1fr_180px_140px] py-2.5 border-b border-line last:border-b-0 items-center text-sm"
                >
                  <span className="font-mono text-xs text-gray-2">
                    {t.date.toISOString().slice(0, 10)}
                  </span>
                  <span className="text-white">
                    {t.memo || t.category?.name || "—"}
                  </span>
                  <span className="font-mono text-xs text-gray-3">
                    {t.finAccount.name}
                    {t.counterAccount ? ` → ${t.counterAccount.name}` : ""}
                  </span>
                  <span className={`mono text-sm text-right ${tone}`}>
                    {sign}{" "}
                    <Money value={t.amount.toString()} currency={t.currency} />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
