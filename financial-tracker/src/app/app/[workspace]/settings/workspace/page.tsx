import { requireMembership } from "@/server/workspace";
import { Eyebrow } from "@/components/mb/Eyebrow";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace } = await requireMembership(slug);
  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <header>
        <Eyebrow>Settings</Eyebrow>
        <h1 className="font-sans text-3xl font-extrabold text-white mt-2">
          Workspace
        </h1>
      </header>
      <div className="mb-card p-6 flex flex-col gap-4">
        <div className="flex justify-between border-b border-line pb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-3">
            Name
          </span>
          <span className="text-white font-semibold">{workspace.name}</span>
        </div>
        <div className="flex justify-between border-b border-line pb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-3">
            Slug
          </span>
          <span className="font-mono text-sm text-gold">{workspace.slug}</span>
        </div>
        <div className="flex justify-between border-b border-line pb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-3">
            Type
          </span>
          <span className="font-mono text-sm text-white">{workspace.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-3">
            Base currency
          </span>
          <span className="font-mono text-sm text-white">{workspace.baseCurrency}</span>
        </div>
      </div>
    </div>
  );
}
