"use client";

import { useTransition } from "react";
import { archiveAccount, unarchiveAccount } from "@/server/actions/accounts";

export function AccountRowActions({
  slug,
  id,
  archived,
}: {
  slug: string;
  id: string;
  archived: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      if (archived) {
        await unarchiveAccount(slug, id);
      } else {
        await archiveAccount(slug, id);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3 hover:text-gold transition-colors text-right disabled:opacity-50"
    >
      {pending ? "…" : archived ? "Unarchive" : "Archive"}
    </button>
  );
}
