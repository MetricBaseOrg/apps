import Link from "next/link";
import { requireMembership } from "@/server/workspace";
import { db } from "@/server/db";
import { buildPortfolio } from "@/server/investments";
import { Eyebrow } from "@/components/mb/Eyebrow";
import { BunEmpty } from "@/components/mb/BunEmpty";
import { KpiCard } from "@/components/mb/KpiCard";
import { Money } from "@/components/mb/Money";
import { PositionCreateForm } from "./PositionCreateForm";
import { PositionActions } from "./PositionActions";

export default async function InvestmentsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace } = await requireMembership(slug);

  const brokerageAccounts = await db.finAccount.findMany({
    where: { workspaceId: workspace.id, type: "BROKERAGE", archivedAt: null },
    orderBy: { createdAt: "asc" },
  });

  const header = (
    <header>
      <Eyebrow>Books</Eyebrow>
      <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-white mt-2">
        Investments
      </h1>
      <p className="text-gray-2 text-sm mt-2">
        Track holdings with FIFO cost basis, realized P/L, and dividends.
      </p>
    </header>
  );

  if (brokerageAccounts.length === 0) {
    return (
      <div className="flex flex-col gap-8 max-w-[1240px]">
        {header}
        <BunEmpty
          title="Add a brokerage account first"
          description="Positions are held in a BROKERAGE account. Create one, then add positions here."
          action={
            <Link
              href={`/app/${slug}/accounts`}
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:text-gold-bright"
            >
              → Go to Accounts
            </Link>
          }
        />
      </div>
    );
  }

  const portfolio = await buildPortfolio(workspace.id, workspace.baseCurrency);
  const base = workspace.baseCurrency;

  return (
    <div className="flex flex-col gap-8 max-w-[1240px]">
      {header}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-line)]">
        <KpiCard
          label="Market value"
          value={<Money value={portfolio.totals.marketValueBase} currency={base} />}
        />
        <KpiCard
          label="Unrealized P/L"
          value={<Money value={portfolio.totals.unrealizedPlBase} currency={base} />}
          deltaTone={portfolio.totals.unrealizedPlBase >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="Realized P/L"
          value={<Money value={portfolio.totals.realizedPlBase} currency={base} />}
          deltaTone={portfolio.totals.realizedPlBase >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="Dividends YTD"
          value={<Money value={portfolio.totals.dividendsYtdBase} currency={base} />}
        />
      </div>

      {!portfolio.fxAvailable && (
        <p className="font-mono text-[11px] text-[var(--color-down)]">
          Some FX rates were unavailable — base-currency totals may be partial.
        </p>
      )}

      <PositionCreateForm
        slug={slug}
        accounts={brokerageAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
        }))}
      />

      {portfolio.positions.length === 0 ? (
        <BunEmpty
          title="No positions yet"
          description="Add your first position above, then record buys, sells, and dividends."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {portfolio.positions.map((p) => (
            <div key={p.id} className="mb-card p-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-sans text-lg font-bold text-white">
                    {p.symbol}
                    {p.name ? (
                      <span className="text-gray-2 font-normal text-sm ml-2">
                        {p.name}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3 mt-1">
                    {p.accountName} · {p.currency}
                    {p.closed ? " · closed" : ""}
                  </span>
                </div>
                <PositionActions
                  slug={slug}
                  positionId={p.id}
                  currency={p.currency}
                  closed={p.closed}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <Metric label="Open qty" value={p.openQty} />
                <Metric
                  label="Avg cost"
                  value={<Money value={p.avgCost} currency={p.currency} />}
                />
                <Metric
                  label="Price"
                  value={
                    p.lastPrice != null ? (
                      <Money value={p.lastPrice} currency={p.currency} />
                    ) : (
                      <span className="text-gray-3">—</span>
                    )
                  }
                />
                <Metric
                  label="Mkt value"
                  value={
                    p.marketValue != null ? (
                      <Money value={p.marketValue} currency={p.currency} />
                    ) : (
                      <span className="text-gray-3">—</span>
                    )
                  }
                />
                <Metric
                  label="Unrl P/L"
                  tone={
                    p.unrealizedPl != null
                      ? Number(p.unrealizedPl) >= 0
                        ? "up"
                        : "down"
                      : undefined
                  }
                  value={
                    p.unrealizedPl != null ? (
                      <Money value={p.unrealizedPl} currency={p.currency} />
                    ) : (
                      <span className="text-gray-3">—</span>
                    )
                  }
                />
                <Metric
                  label="Rlzd P/L"
                  tone={Number(p.realizedPl) >= 0 ? "up" : "down"}
                  value={<Money value={p.realizedPl} currency={p.currency} />}
                />
                <Metric
                  label="Div YTD"
                  value={<Money value={p.dividendsYtd} currency={p.currency} />}
                />
              </div>

              <details className="border-t border-line pt-3">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3 hover:text-gold">
                  Lots & dividends
                </summary>
                <div className="mt-4 flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <Eyebrow>Lots (FIFO)</Eyebrow>
                    {p.lots.length === 0 ? (
                      <span className="text-gray-3 text-sm">No lots.</span>
                    ) : (
                      <div className="flex flex-col">
                        <div className="hidden md:grid grid-cols-[120px_1fr_1fr_1fr_140px] py-2 border-b border-line">
                          {["Acquired", "Qty", "Remaining", "Cost/unit", "Fees"].map(
                            (h) => (
                              <span
                                key={h}
                                className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-3"
                              >
                                {h}
                              </span>
                            ),
                          )}
                        </div>
                        {p.lots.map((l) => (
                          <div
                            key={l.id}
                            className="grid grid-cols-2 md:grid-cols-[120px_1fr_1fr_1fr_140px] gap-1 py-2 border-b border-line last:border-b-0 text-sm"
                          >
                            <span className="font-mono text-xs text-gray-2">
                              {l.acquiredAt.toISOString().slice(0, 10)}
                            </span>
                            <span className="mono text-white">{l.quantity}</span>
                            <span className="mono text-gray-2">
                              {l.remainingQuantity}
                            </span>
                            <span className="mono text-white">
                              <Money value={l.costPerUnit} currency={p.currency} />
                            </span>
                            <span className="mono text-gray-2">
                              {l.fees != null ? (
                                <Money value={l.fees} currency={p.currency} />
                              ) : (
                                "—"
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Eyebrow>Dividend history</Eyebrow>
                    {p.dividends.length === 0 ? (
                      <span className="text-gray-3 text-sm">No dividends.</span>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {p.dividends.map((d) => (
                          <li
                            key={d.id}
                            className="flex justify-between text-sm font-mono border-b border-line last:border-b-0 py-1.5"
                          >
                            <span className="text-gray-2">
                              {d.payDate.toISOString().slice(0, 10)}
                            </span>
                            <span className="text-white">
                              <Money value={d.totalAmount} currency={p.currency} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "up" | "down";
}) {
  const toneClass =
    tone === "up"
      ? "text-[var(--color-up)]"
      : tone === "down"
        ? "text-[var(--color-down)]"
        : "text-white";
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
        {label}
      </span>
      <span className={`mono text-sm ${toneClass}`}>{value}</span>
    </div>
  );
}
