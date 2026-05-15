import { requireMembership } from "@/server/workspace";
import { db } from "@/server/db";
import { Topnav } from "@/components/mb/Topnav";
import { Eyebrow } from "@/components/mb/Eyebrow";
import { GoldButton } from "@/components/mb/GoldButton";
import { recordTrade } from "@/server/actions/investments";
import { aggregatePosition } from "@/lib/positions";
import Link from "next/link";

async function TradeForm({ workspace }: { workspace: { id: string; slug: string } }) {
  const finAccounts = await db.finAccount.findMany({
    where: {
      workspaceId: workspace.id,
      type: { in: ["BROKERAGE", "CRYPTO"] },
      archivedAt: null,
    },
    orderBy: { name: "asc" },
  });

  const handleSubmit = async (formData: FormData) => {
    "use server";
    await recordTrade(workspace.slug, undefined, formData);
  };

  return (
    <form action={handleSubmit} className="mb-card p-6 flex flex-col gap-5">
      <Eyebrow>Record trade</Eyebrow>

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
          Account
        </span>
        <select
          name="finAccountId"
          required
          className="mb-input"
        >
          <option value="">Select an account</option>
          {finAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} ({acc.currency})
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
            Symbol
          </span>
          <input
            type="text"
            name="symbol"
            required
            placeholder="AAPL"
            maxLength={20}
            className="mb-input"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
            Unit kind
          </span>
          <select name="unitKind" required className="mb-input">
            <option value="SHARES">Shares</option>
            <option value="TOKENS">Tokens</option>
            <option value="LOTS">Lots</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
            Side
          </span>
          <select name="side" required className="mb-input">
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
            Date
          </span>
          <input type="date" name="date" required className="mb-input" />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
            Quantity
          </span>
          <input
            type="number"
            name="quantity"
            required
            step="0.00000001"
            placeholder="1"
            className="mb-input"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
            Unit price
          </span>
          <input
            type="number"
            name="unitPrice"
            required
            step="0.01"
            placeholder="0.00"
            className="mb-input"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
            Fee (optional)
          </span>
          <input
            type="number"
            name="fee"
            step="0.01"
            placeholder="0.00"
            className="mb-input"
          />
        </label>
      </div>

      <GoldButton type="submit" variant="primary">
        Record trade
      </GoldButton>
    </form>
  );
}

export default async function InvestmentsPage({
  params,
}: {
  params: { workspace: string };
}) {
  const { workspace } = await requireMembership(params.workspace, "MEMBER");

  const positions = await db.position.findMany({
    where: { workspaceId: workspace.id },
    include: {
      lots: true,
      txns: true,
    },
    orderBy: { symbol: "asc" },
  });

  const aggregated = positions.map((pos) =>
    aggregatePosition(pos, pos.lots),
  );

  return (
    <>
      <Topnav sectionLabel="Investments" />
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-8">
          <Link
            href={`/app/${params.workspace}/dashboard`}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-2 hover:text-gold transition-colors self-start"
          >
            ← Back to dashboard
          </Link>

          <header>
            <Eyebrow>Investment positions</Eyebrow>
            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Holdings and lots
            </h1>
          </header>

          {aggregated.length === 0 ? (
            <div className="mb-card p-6 text-center">
              <p className="text-gray-2">No positions yet.</p>
            </div>
          ) : (
            <div className="mb-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Symbol
                    </th>
                    <th className="text-left px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Unit kind
                    </th>
                    <th className="text-right px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Quantity
                    </th>
                    <th className="text-right px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Avg cost
                    </th>
                    <th className="text-right px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Cost basis
                    </th>
                    <th className="text-right px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Realized P&L
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {aggregated.map((agg) => (
                    <tr
                      key={agg.position.id}
                      className="border-b border-line last:border-b-0 hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <td className="px-6 py-3 text-white font-mono font-bold">
                        {agg.position.symbol}
                      </td>
                      <td className="px-6 py-3 text-gray-2 text-xs">
                        {agg.position.unitKind}
                      </td>
                      <td className="px-6 py-3 text-right text-white font-mono text-xs">
                        {agg.quantity.toString()}
                      </td>
                      <td className="px-6 py-3 text-right text-white font-mono text-xs">
                        {agg.avgCostPerUnit.toString()}
                      </td>
                      <td className="px-6 py-3 text-right text-white font-mono text-xs">
                        {agg.totalCostBasis.toString()}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-mono text-xs ${
                          agg.realizedPnL.greaterThan(0)
                            ? "text-[var(--color-up)]"
                            : agg.realizedPnL.lessThan(0)
                              ? "text-[var(--color-down)]"
                              : "text-gray-2"
                        }`}
                      >
                        {agg.realizedPnL.toString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <TradeForm workspace={workspace} />
        </div>
      </main>
    </>
  );
}
