import { requireMembership } from "@/server/workspace";
import { Eyebrow } from "@/components/mb/Eyebrow";
import { BunEmpty } from "@/components/mb/BunEmpty";

export default async function InvestmentsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  await requireMembership(slug);

  return (
    <div className="flex flex-col gap-8 max-w-[1240px]">
      <header>
        <Eyebrow>Books</Eyebrow>
        <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-white mt-2">
          Investments
        </h1>
        <p className="text-gray-2 text-sm mt-2">
          Track your investment portfolios, holdings, and performance.
        </p>
      </header>
      <BunEmpty
        title="No investments yet"
        description="Investment tracking is coming soon."
      />
    </div>
  );
}
