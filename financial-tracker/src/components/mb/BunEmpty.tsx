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
        className="w-16 h-16 flex items-center justify-center text-3xl"
        style={{
          border: "1px solid var(--color-line-strong)",
          background: "rgba(201, 168, 76, 0.05)",
        }}
      >
        <span className="font-sans font-extrabold text-gold">B</span>
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
