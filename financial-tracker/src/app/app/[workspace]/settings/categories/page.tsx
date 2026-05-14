import { requireMembership } from "@/server/workspace";
import { db } from "@/server/db";
import { Eyebrow } from "@/components/mb/Eyebrow";
import { Money } from "@/components/mb/Money";
import { CategoryCreateForm } from "./CategoryCreateForm";
import { CategoryRowActions } from "./CategoryRowActions";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace } = await requireMembership(slug);

  const cats = await db.category.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  const income = cats.filter((c) => c.kind === "INCOME");
  const expense = cats.filter((c) => c.kind === "EXPENSE");

  return (
    <div className="flex flex-col gap-8 max-w-[1240px]">
      <header>
        <Eyebrow>Settings</Eyebrow>
        <h1 className="font-sans text-3xl font-extrabold text-white mt-2">
          Categories
        </h1>
        <p className="text-gray-2 text-sm mt-2">
          Used to group transactions and set monthly budgets. Categories with
          existing transactions can&apos;t be deleted yet.
        </p>
      </header>

      <CategoryCreateForm slug={slug} />

      <div className="grid md:grid-cols-2 gap-6">
        <CategoryTable
          slug={slug}
          title="Income"
          items={income}
          base={workspace.baseCurrency}
        />
        <CategoryTable
          slug={slug}
          title="Expense"
          items={expense}
          base={workspace.baseCurrency}
        />
      </div>
    </div>
  );
}

function CategoryTable({
  slug,
  title,
  items,
  base,
}: {
  slug: string;
  title: string;
  items: {
    id: string;
    name: string;
    monthlyBudget: { toString(): string } | null;
  }[];
  base: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Eyebrow>{title}</Eyebrow>
      <div className="mb-card">
        <div className="grid grid-cols-[1fr_140px_80px] px-4 py-3 border-b border-line">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-3">
            Name
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-3">
            Budget / mo
          </span>
          <span />
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-3 text-sm">
            No categories
          </div>
        ) : (
          items.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_140px_80px] px-4 py-3 border-b border-line last:border-b-0 items-center hover:bg-[var(--color-bg-hover)] transition-colors"
            >
              <span className="font-sans text-white text-sm">{c.name}</span>
              <span className="mono text-xs text-gray-2">
                {c.monthlyBudget ? (
                  <Money value={c.monthlyBudget.toString()} currency={base} />
                ) : (
                  <span className="text-gray-3">—</span>
                )}
              </span>
              <CategoryRowActions slug={slug} id={c.id} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
