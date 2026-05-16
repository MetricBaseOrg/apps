import { Eyebrow } from "./Eyebrow";

export function BunEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-card p-12 flex flex-col items-center text-center gap-4">
      <div
        aria-hidden
        className="w-16 h-16 overflow-hidden"
        style={{ border: "1px solid var(--color-line-strong)" }}
      >
        <img
          src="https://metricbase.org/assets/pfp.png"
          alt="Bun"
          className="w-full h-full object-cover"
        />
      </div>
      <Eyebrow>Bun says</Eyebrow>
      <h3 className="font-sans text-xl font-bold text-white max-w-md">
        {title}
      </h3>
      {description && (
        <p className="text-gray-2 text-sm max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
