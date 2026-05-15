import { requireMembership } from "@/server/workspace";
import { db } from "@/server/db";
import { Topnav } from "@/components/mb/Topnav";
import { Eyebrow } from "@/components/mb/Eyebrow";
import { GoldButton } from "@/components/mb/GoldButton";
import { postDueRules } from "@/server/actions/recurring";
import Link from "next/link";

export default async function RecurringPage({
  params,
}: {
  params: { workspace: string };
}) {
  const { workspace } = await requireMembership(params.workspace, "MEMBER");

  const rules = await db.recurringRule.findMany({
    where: { workspaceId: workspace.id },
    include: {
      finAccount: true,
      counterAccount: true,
      category: true,
    },
    orderBy: { nextRunDate: "asc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueRulesCount = rules.filter((r) => {
    const isDue = r.nextRunDate <= today;
    const notEnded = !r.endDate || r.endDate >= today;
    return isDue && notEnded;
  }).length;

  return (
    <>
      <Topnav sectionLabel="Recurring" />
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-8">
          <Link
            href={`/app/${params.workspace}/transactions`}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-2 hover:text-gold transition-colors self-start"
          >
            ← Back to transactions
          </Link>

          <header>
            <Eyebrow>Recurring transactions</Eyebrow>
            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Manage recurring rules
            </h1>
          </header>

          {dueRulesCount > 0 && (
            <form
              action={async () => {
                "use server";
                const result = await postDueRules(params.workspace);
                if (result.success) {
                  // Revalidation happens in the server action
                }
              }}
              className="mb-card p-6 flex gap-4 items-center"
            >
              <div className="flex-1">
                <p className="text-white font-mono text-sm">
                  {dueRulesCount} recurring rule{dueRulesCount === 1 ? "" : "s"} due
                </p>
                <p className="text-gray-3 text-xs mt-1">
                  Post materialized transactions for rules past their next run date
                </p>
              </div>
              <GoldButton type="submit" variant="primary">
                Post due
              </GoldButton>
            </form>
          )}

          {rules.length === 0 ? (
            <div className="mb-card p-6 text-center">
              <p className="text-gray-2">No recurring rules yet.</p>
            </div>
          ) : (
            <div className="mb-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Account
                    </th>
                    <th className="text-left px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Type
                    </th>
                    <th className="text-right px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Amount
                    </th>
                    <th className="text-left px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Frequency
                    </th>
                    <th className="text-left px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
                      Next run
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr
                      key={rule.id}
                      className="border-b border-line last:border-b-0 hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      <td className="px-6 py-3 text-white">{rule.finAccount.name}</td>
                      <td className="px-6 py-3 text-gray-2">{rule.type}</td>
                      <td className="px-6 py-3 text-right text-white font-mono text-xs">
                        {rule.amount.toString()} {rule.currency}
                      </td>
                      <td className="px-6 py-3 text-gray-2">
                        Every {rule.interval} {rule.freq.toLowerCase()}
                        {rule.interval > 1 ? "s" : ""}
                      </td>
                      <td className="px-6 py-3 text-gray-2 text-xs">
                        {rule.nextRunDate.toISOString().slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
