"use client";

import { useTransition } from "react";
import { deleteTransaction } from "@/server/actions/transactions";

export function TransactionRowActions({
  slug,
  id,
}: {
  slug: string;
  id: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("Delete this transaction?")) return;
        startTransition(async () => {
          await deleteTransaction(slug, id);
        });
      }}
      disabled={pending}
      className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3 hover:text-[var(--color-down)] transition-colors text-right disabled:opacity-50"
    >
      {pending ? "…" : "Del"}
    </button>
  );
}
