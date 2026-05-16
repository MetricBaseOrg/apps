import "server-only";
import Decimal from "decimal.js";
import { db } from "@/server/db";
import type { DashboardPeriod } from "@/lib/periods";
import { PERIOD_LABELS } from "@/lib/periods";

export type SankeyNode = { name: string };
export type SankeyLink = { source: number; target: number; value: number };

export type DashboardSummary = {
  cashflowMtd: string; // baseCurrency
  incomeMtd: string;
  expenseMtd: string;
  monthOverMonth: number | null; // percent vs prior month cashflow
  cashflowByMonth: { month: string; income: number; expense: number }[];
  categoryBreakdown: { name: string; value: number; color: string | null }[];
  sankey: { nodes: SankeyNode[]; links: SankeyLink[] };
  recent: Awaited<ReturnType<typeof recentTxns>>;
};

async function recentTxns(workspaceId: string) {
  return db.transaction.findMany({
    where: { workspaceId },
    include: { finAccount: true, category: true, counterAccount: true },
    orderBy: { date: "desc" },
    take: 5,
  });
}

export type { DashboardPeriod };
export { PERIOD_LABELS };

function periodRange(period: DashboardPeriod): { rangeStart: Date; rangeEnd: Date; barMonths: number } {
  const now = new Date();
  const rangeEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  switch (period) {
    case "mtd":
      return { rangeStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), rangeEnd, barMonths: 1 };
    case "3m":
      return { rangeStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)), rangeEnd, barMonths: 3 };
    case "6m":
      return { rangeStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)), rangeEnd, barMonths: 6 };
    case "ytd":
      return { rangeStart: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), rangeEnd, barMonths: now.getUTCMonth() + 1 };
    case "1y":
      return { rangeStart: new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 1)), rangeEnd, barMonths: 12 };
  }
}

export async function buildDashboard(
  workspaceId: string,
  period: DashboardPeriod = "mtd",
): Promise<DashboardSummary> {
  const now = new Date();
  const { rangeStart: monthStart, rangeEnd: nextMonthStart, barMonths } = periodRange(period);
  const prevMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );

  // MTD aggregates
  const mtdAgg = await db.transaction.groupBy({
    by: ["type"],
    where: {
      workspaceId,
      date: { gte: monthStart, lt: nextMonthStart },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    _sum: { baseAmount: true },
  });

  const incomeMtd = new Decimal(
    mtdAgg.find((a) => a.type === "INCOME")?._sum.baseAmount?.toString() ?? 0,
  );
  const expenseMtd = new Decimal(
    mtdAgg.find((a) => a.type === "EXPENSE")?._sum.baseAmount?.toString() ?? 0,
  );
  const cashflowMtd = incomeMtd.minus(expenseMtd);

  // Prior month for MoM
  const prevAgg = await db.transaction.groupBy({
    by: ["type"],
    where: {
      workspaceId,
      date: { gte: prevMonthStart, lt: monthStart },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    _sum: { baseAmount: true },
  });
  const prevIncome = new Decimal(
    prevAgg.find((a) => a.type === "INCOME")?._sum.baseAmount?.toString() ?? 0,
  );
  const prevExpense = new Decimal(
    prevAgg.find((a) => a.type === "EXPENSE")?._sum.baseAmount?.toString() ?? 0,
  );
  const prevCashflow = prevIncome.minus(prevExpense);
  const monthOverMonth = prevCashflow.isZero()
    ? null
    : cashflowMtd.minus(prevCashflow).div(prevCashflow.abs()).times(100).toNumber();

  // Bar series for selected period
  const series = await db.transaction.findMany({
    where: {
      workspaceId,
      date: { gte: monthStart, lt: nextMonthStart },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    select: { date: true, type: true, baseAmount: true },
  });
  const byMonth = new Map<string, { income: number; expense: number }>();
  for (let i = 0; i < barMonths; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (barMonths - 1 - i), 1));
    const key = d.toISOString().slice(0, 7);
    byMonth.set(key, { income: 0, expense: 0 });
  }
  for (const t of series) {
    const key = t.date.toISOString().slice(0, 7);
    const slot = byMonth.get(key);
    if (!slot) continue;
    const v = new Decimal(t.baseAmount.toString()).toNumber();
    if (t.type === "INCOME") slot.income += v;
    else slot.expense += v;
  }
  const cashflowByMonth = Array.from(byMonth.entries()).map(([month, v]) => ({
    month,
    income: Math.round(v.income),
    expense: Math.round(v.expense),
  }));

  // Category breakdown MTD (expenses only)
  const catAgg = await db.transaction.groupBy({
    by: ["categoryId"],
    where: {
      workspaceId,
      date: { gte: monthStart, lt: nextMonthStart },
      type: "EXPENSE",
    },
    _sum: { baseAmount: true },
  });
  const categoryIds = catAgg.map((c) => c.categoryId).filter(Boolean) as string[];
  const cats = await db.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, color: true },
  });
  const byId = new Map(cats.map((c) => [c.id, c]));
  const categoryBreakdown = catAgg
    .map((c) => ({
      name: c.categoryId
        ? byId.get(c.categoryId)?.name ?? "Uncategorized"
        : "Uncategorized",
      value: new Decimal(c._sum.baseAmount?.toString() ?? 0).toNumber(),
      color: c.categoryId ? byId.get(c.categoryId)?.color ?? null : null,
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Sankey: income categories → [You] → expense categories (MTD)
  const incomeAgg = await db.transaction.groupBy({
    by: ["categoryId"],
    where: { workspaceId, date: { gte: monthStart, lt: nextMonthStart }, type: "INCOME" },
    _sum: { baseAmount: true },
  });
  const incomeCatIds = incomeAgg.map((r) => r.categoryId).filter(Boolean) as string[];
  const incomeCats = await db.category.findMany({ where: { id: { in: incomeCatIds } }, select: { id: true, name: true } });
  const incomeCatMap = new Map(incomeCats.map((c) => [c.id, c.name]));

  const incomeNodes: SankeyNode[] = incomeAgg
    .filter((r) => new Decimal(r._sum.baseAmount?.toString() ?? 0).toNumber() > 0)
    .map((r) => ({ name: r.categoryId ? incomeCatMap.get(r.categoryId) ?? "Income" : "Income" }));

  const youIndex = incomeNodes.length;
  const expenseNodes: SankeyNode[] = categoryBreakdown.map((c) => ({ name: c.name }));

  const sankeyNodes: SankeyNode[] = [...incomeNodes, { name: "You" }, ...expenseNodes];

  const incomeLinks: SankeyLink[] = incomeAgg
    .filter((r) => new Decimal(r._sum.baseAmount?.toString() ?? 0).toNumber() > 0)
    .map((r, i) => ({
      source: i,
      target: youIndex,
      value: Math.round(new Decimal(r._sum.baseAmount?.toString() ?? 0).toNumber()),
    }));

  const expenseLinks: SankeyLink[] = categoryBreakdown.map((c, i) => ({
    source: youIndex,
    target: youIndex + 1 + i,
    value: Math.round(c.value),
  }));

  const sankey = {
    nodes: sankeyNodes,
    links: [...incomeLinks, ...expenseLinks].filter((l) => l.value > 0),
  };

  const recent = await recentTxns(workspaceId);

  return {
    cashflowMtd: cashflowMtd.toString(),
    incomeMtd: incomeMtd.toString(),
    expenseMtd: expenseMtd.toString(),
    monthOverMonth,
    cashflowByMonth,
    categoryBreakdown,
    sankey,
    recent,
  };
}

export type BudgetRow = {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
  budget: number | null;
  actual: number; // baseCurrency, MTD
};

export async function buildBudgets(workspaceId: string): Promise<BudgetRow[]> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const cats = await db.category.findMany({
    where: { workspaceId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
  const agg = await db.transaction.groupBy({
    by: ["categoryId"],
    where: {
      workspaceId,
      date: { gte: monthStart, lt: nextMonthStart },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    _sum: { baseAmount: true },
  });
  const byId = new Map(
    agg.map((a) => [
      a.categoryId,
      new Decimal(a._sum.baseAmount?.toString() ?? 0).toNumber(),
    ]),
  );
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    budget: c.monthlyBudget ? new Decimal(c.monthlyBudget.toString()).toNumber() : null,
    actual: byId.get(c.id) ?? 0,
  }));
}
