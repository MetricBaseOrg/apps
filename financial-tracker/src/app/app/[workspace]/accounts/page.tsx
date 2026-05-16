import { requireMembership } from "@/server/workspace";
import { db } from "@/server/db";
import { Eyebrow } from "@/components/mb/Eyebrow";
import { BunEmpty } from "@/components/mb/BunEmpty";
import { Money } from "@/components/mb/Money";
import { AccountCreateForm } from "./AccountCreateForm";
import { AccountRowActions } from "./AccountRowActions";

export default async function AccountsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace } = await requireMembership(slug);

  const accounts = await db.finAccount.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ archivedAt: "asc" }, { createdAt: "asc" }],
  });

  const active = accounts.filter((a) => !a.archivedAt);
  const archived = accounts.filter((a) => a.archivedAt);

  return (
    <div className="flex flex-col gap-8 max-w-[1240px]">
      <header className="flex items-end justify-between">
        <div>
          <Eyebrow>Accounts</Eyebrow>
          <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-white mt-2">
            Financial Accounts
          </h1>
          <p className="text-gray-2 text-sm mt-2">
            Bank, cash, crypto, brokerage. Set a currency and opening balance
            per account.
          </p>
        </div>
      </header>

      <AccountCreateForm slug={slug} workspaceBase={workspace.baseCurrency} />

      {active.length === 0 ? (
        <BunEmpty
          title="No accounts yet"
          description="Add your first account above. Bun will use it as the starting point for your books."
        />
      ) : (
        <div className="mb-card">
          <div className="hidden md:grid grid-cols-[1fr_120px_120px_160px_120px] px-4 py-3 border-b border-line">
            {["Name", "Type", "Currency", "Opening Balance", ""].map((h) => (
              <span
                key={h}
                className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-3"
              >
                {h}
              </span>
            ))}
          </div>
          {active.map((a) => (
            <div
              key={a.id}
              className="border-b border-line last:border-b-0 hover:bg-[var(--color-bg-hover)] transition-colors"
            >
              <div className="hidden md:grid grid-cols-[1fr_120px_120px_160px_120px] px-4 py-3 items-center">
                <span className="font-sans text-white">{a.name}</span>
                <span className="font-mono text-xs text-gray-2">{a.type}</span>
                <span className="font-mono text-xs text-gold">{a.currency}</span>
                <Money
                  value={a.openingBalance.toString()}
                  currency={a.currency}
                  className="text-white"
                />
                <AccountRowActions slug={slug} id={a.id} archived={false} name={a.name} type={a.type} currency={a.currency} openingBalance={a.openingBalance.toString()} />
              </div>
              <div className="md:hidden px-4 py-4 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="font-sans text-white font-semibold truncate">
                      {a.name}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-3 mt-1">
                      {a.type} · <span className="text-gold">{a.currency}</span>
                    </span>
                  </div>
                  <Money
                    value={a.openingBalance.toString()}
                    currency={a.currency}
                    className="text-white text-base font-bold shrink-0"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <AccountRowActions slug={slug} id={a.id} archived={false} name={a.name} type={a.type} currency={a.currency} openingBalance={a.openingBalance.toString()} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="flex flex-col gap-3">
          <Eyebrow>Archived</Eyebrow>
          <div className="mb-card opacity-60">
            {archived.map((a) => (
              <div
                key={a.id}
                className="border-b border-line last:border-b-0"
              >
                <div className="hidden md:grid grid-cols-[1fr_120px_120px_160px_120px] px-4 py-3 items-center">
                  <span className="font-sans text-gray-2">{a.name}</span>
                  <span className="font-mono text-xs text-gray-3">{a.type}</span>
                  <span className="font-mono text-xs text-gray-3">{a.currency}</span>
                  <Money
                    value={a.openingBalance.toString()}
                    currency={a.currency}
                    className="text-gray-3"
                  />
                  <AccountRowActions slug={slug} id={a.id} archived name={a.name} type={a.type} currency={a.currency} openingBalance={a.openingBalance.toString()} />
                </div>
                <div className="md:hidden px-4 py-3 flex justify-between items-center gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="font-sans text-gray-2 truncate">{a.name}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-3 mt-1">
                      {a.type} · {a.currency}
                    </span>
                  </div>
                  <AccountRowActions slug={slug} id={a.id} archived name={a.name} type={a.type} currency={a.currency} openingBalance={a.openingBalance.toString()} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
