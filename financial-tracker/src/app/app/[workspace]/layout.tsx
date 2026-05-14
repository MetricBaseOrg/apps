import { requireMembership, getCurrentUserWorkspaces } from "@/server/workspace";
import { AppTopbar } from "@/components/mb/AppTopbar";
import { Sidebar } from "@/components/mb/Sidebar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace, user } = await requireMembership(slug);
  const memberships = await getCurrentUserWorkspaces();

  const workspaces = memberships.map((m) => ({
    slug: m.workspace.slug,
    name: m.workspace.name,
    type: m.workspace.type,
    baseCurrency: m.workspace.baseCurrency,
  }));

  return (
    <div className="flex flex-col min-h-screen">
      <AppTopbar
        current={{
          slug: workspace.slug,
          name: workspace.name,
          type: workspace.type,
          baseCurrency: workspace.baseCurrency,
        }}
        workspaces={workspaces}
        userEmail={user.email}
      />
      <div className="flex flex-1">
        <Sidebar workspaceSlug={workspace.slug} />
        <div className="flex-1 px-6 md:px-8 py-8">{children}</div>
      </div>
    </div>
  );
}
