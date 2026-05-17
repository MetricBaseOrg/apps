import Link from "next/link";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { MobileNav } from "./MobileNav";
import { signOutAction } from "@/server/actions/auth";
import type { WorkspaceType } from "@prisma/client";

type Item = {
  slug: string;
  name: string;
  type: WorkspaceType;
  baseCurrency: string;
};

export function AppTopbar({
  current,
  workspaces,
  userEmail,
  alertCount = 0,
}: {
  current: Item;
  workspaces: Item[];
  userEmail?: string | null;
  alertCount?: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[var(--color-bg-elev)]">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <WorkspaceSwitcher current={current} workspaces={workspaces} />
        <div className="flex items-center gap-3 md:gap-4">
          {alertCount > 0 && (
            <Link
              href={`/app/${current.slug}/notifications`}
              aria-label={`${alertCount} alerts`}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-down)] border border-[var(--color-down)] hover:bg-[var(--color-down)] hover:text-black px-2.5 py-1 transition-colors"
            >
              <span aria-hidden>●</span>
              <span>{alertCount}</span>
            </Link>
          )}
          {userEmail && (
            <Link
              href="/app/profile"
              className="font-mono text-[11px] text-gray-3 hover:text-gold transition-colors hidden md:inline"
            >
              {userEmail}
            </Link>
          )}
          <form action={signOutAction} className="hidden md:block">
            <button
              type="submit"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-2 hover:text-gold transition-colors"
            >
              Sign out
            </button>
          </form>
          <MobileNav workspaceSlug={current.slug} />
        </div>
      </div>
    </header>
  );
}
