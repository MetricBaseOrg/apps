import { requireMembership } from "@/server/workspace";
import { db } from "@/server/db";
import { Eyebrow } from "@/components/mb/Eyebrow";
import { Money } from "@/components/mb/Money";
import { postDueRulesAction } from "@/server/actions/recurring";

export default async function RecurringPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace } = await requireMembership(slug);

  const rules = await db.recurringRule.findMany({
    where: { workspaceId: workspace.id },
    include: {
      finAccount: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const dueCount = await db.recurringRule.count({
    where: {
      workspaceId: workspace.id,
      nextRunDate: { lte: new Date() },
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
  });

  return (
    <div className="flex flex-col gap-8 max-w-[1240px]">
      <header>
        <Eyebrow>Transactions</Eyebrow>
        <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-white mt-2">
          Recurring Rules
        </h1>
      </header>

      {dueCount > 0 && (
        <form action={postDueRulesAction.bind(null, slug)} className="flex gap-2">
          <button
            type="submit"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:text-gold-bright px-3 py-2 border border-gold/30 hover:border-gold/50 transition-colors"
          >
            Post due ({dueCount})
          </button>
        </form>
      )}

      {rules.length === 0 ? (
        <p className="text-gray-2">No recurring rules yet.</p>
      ) : (
        <div className="overflow-x-auto border border-line rounded-none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left px-4 py-3 text-gray-2 font-mono text-[11px] uppercase tracking-[0.18em]">
                  Account
                </th>
                <th className="text-left px-4 py-3 text-gray-2 font-mono text-[11px] uppercase tracking-[0.18em]">
                  Type
                </th>
                <th className="text-right px-4 py-3 text-gray-2 font-mono text-[11px] uppercase tracking-[0.18em]">
                  Amount
                </th>
                <th className="text-left px-4 py-3 text-gray-2 font-mono text-[11px] uppercase tracking-[0.18em]">
                  Frequency
                </th>
                <th className="text-left px-4 py-3 text-gray-2 font-mono text-[11px] uppercase tracking-[0.18em]">
                  Next Run
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-line/50 hover:bg-mid/50 transition-colors"
                >
                  <td className="px-4 py-3 text-white">{rule.finAccount.name}</td>
                  <td className="px-4 py-3 text-white text-xs">
                    <span className="font-mono px-2 py-1 bg-mid rounded-none">
                      {rule.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    <Money value={rule.amount} currency={rule.currency} />
                  </td>
                  <td className="px-4 py-3 text-white text-xs">
                    Every {rule.interval} {rule.freq.toLowerCase()}
                    {rule.interval > 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 text-white text-xs">
                    {rule.nextRunDate.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
