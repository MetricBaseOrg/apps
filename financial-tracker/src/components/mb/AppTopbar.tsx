import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
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
}: {
  current: Item;
  workspaces: Item[];
  userEmail?: string | null;
}) {
  return (
    <header className="border-b border-line bg-[var(--color-bg-elev)]/60 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <WorkspaceSwitcher current={current} workspaces={workspaces} />
        <div className="flex items-center gap-4">
          {userEmail && (
            <span className="font-mono text-[11px] text-gray-3 hidden md:inline">
              {userEmail}
            </span>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-2 hover:text-gold transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
