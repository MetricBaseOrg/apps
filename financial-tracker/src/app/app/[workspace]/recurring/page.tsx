import { RecurringContent } from "./RecurringContent";

export default async function RecurringPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { requireMembership } = await import("@/server/workspace");
  const { db } = await import("@/server/db");

  const { workspace: workspaceSlug } = await params;
  const { workspace } = await requireMembership(workspaceSlug, "MEMBER");

  const [rules, accounts, categories] = await Promise.all([
    db.recurringRule.findMany({
      where: { workspaceId: workspace.id },
      include: {
        finAccount: true,
        counterAccount: true,
        category: true,
      },
      orderBy: { nextRunDate: "asc" },
    }),
    db.finAccount.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
    }),
    db.category.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueRulesCount = rules.filter((r) => {
    const isDue = r.nextRunDate <= today;
    const notEnded = !r.endDate || r.endDate >= today;
    return isDue && notEnded;
  }).length;

  const serializedRules = rules.map((r) => {
    const { amount, finAccount, ...rest } = r;
    return {
      ...rest,
      amount: amount.toString(),
      finAccount: finAccount
        ? {
            ...finAccount,
            openingBalance: finAccount.openingBalance.toString(),
          }
        : null,
    };
  }) as any;

  const serializedAccounts = accounts.map((a) => ({
    ...a,
    openingBalance: a.openingBalance.toString(),
  }));

  return (
    <RecurringContent
      rules={serializedRules}
      dueRulesCount={dueRulesCount}
      slug={workspaceSlug}
      accounts={serializedAccounts}
      categories={categories}
    />
  );
}
