import { requireMembership } from "@/server/workspace";
import { db } from "@/server/db";
import { RecurringContent } from "./RecurringContent";

export default async function RecurringPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace } = await requireMembership(slug);

  const [rules, dueCount, accounts, categories] = await Promise.all([
    db.recurringRule.findMany({
      where: { workspaceId: workspace.id },
      include: { finAccount: true },
      orderBy: { createdAt: "desc" },
    }),
    db.recurringRule.count({
      where: {
        workspaceId: workspace.id,
        nextRunDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
    }),
    db.finAccount.findMany({
      where: { workspaceId: workspace.id, archivedAt: null },
      select: { id: true, name: true, currency: true },
    }),
    db.category.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, kind: true },
    }),
  ]);

  return (
    <RecurringContent
      rules={rules.map((r) => ({ ...r, amount: r.amount.toString() }))}
      dueRulesCount={dueCount}
      slug={slug}
      accounts={accounts}
      categories={categories}
    />
  );
}
