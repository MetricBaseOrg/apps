import Link from "next/link";
import { Eyebrow } from "./Eyebrow";
import { METRICBASE_LINKS } from "@/lib/constants";

type Item = { href: string; label: string; external?: boolean };

export function Sidebar({ workspaceSlug }: { workspaceSlug: string }) {
  const sections: { title: string; items: Item[] }[] = [
    {
      title: "Books",
      items: [
        { href: `/app/${workspaceSlug}/dashboard`, label: "Dashboard" },
        { href: `/app/${workspaceSlug}/transactions`, label: "Transactions" },
        { href: `/app/${workspaceSlug}/recurring`, label: "Recurring" },
        { href: `/app/${workspaceSlug}/accounts`, label: "Accounts" },
        { href: `/app/${workspaceSlug}/budgets`, label: "Budgets" },
      ],
    },
    {
      title: "Analysis",
      items: [
        { href: `/app/${workspaceSlug}/reports/pnl`, label: "P&L" },
        { href: `/app/${workspaceSlug}/reports/balance-sheet`, label: "Balance Sheet" },
      ],
    },
    {
      title: "Settings",
      items: [
        { href: `/app/${workspaceSlug}/settings/workspace`, label: "Workspace" },
        { href: `/app/${workspaceSlug}/settings/categories`, label: "Categories" },
        { href: `/app/${workspaceSlug}/settings/fx`, label: "FX Rates" },
        { href: `/app/profile`, label: "Profile" },
      ],
    },
    {
      title: "MetricBase",
      items: [
        { href: METRICBASE_LINKS.home, label: "Home", external: true },
        { href: METRICBASE_LINKS.energy, label: "Energy", external: true },
        { href: METRICBASE_LINKS.chain, label: "Crypto", external: true },
        { href: METRICBASE_LINKS.saham, label: "Saham", external: true },
        { href: METRICBASE_LINKS.contact, label: "Contact us", external: true },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col gap-8 border-r border-line bg-[var(--color-bg-elev)]/60 px-4 py-6">
      {sections.map((s) => (
        <div key={s.title} className="flex flex-col gap-2">
          <Eyebrow className="px-2">{s.title}</Eyebrow>
          <nav className="flex flex-col gap-px">
            {s.items.map((i) =>
              i.external ? (
                <a
                  key={i.href}
                  href={i.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-2 hover:text-gold hover:bg-[rgba(201,168,76,0.06)] px-2 py-2 transition-colors flex items-center justify-between"
                >
                  <span>{i.label}</span>
                  <span className="text-gray-3 text-[9px]">↗</span>
                </a>
              ) : (
                <Link
                  key={i.href}
                  href={i.href}
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-2 hover:text-gold hover:bg-[rgba(201,168,76,0.06)] px-2 py-2 transition-colors"
                >
                  {i.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      ))}
    </aside>
  );
}
