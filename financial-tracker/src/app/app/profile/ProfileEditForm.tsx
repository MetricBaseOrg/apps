"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, type ProfileState } from "@/server/actions/profile";
import { GoldButton } from "@/components/mb/GoldButton";
import { Eyebrow } from "@/components/mb/Eyebrow";

export function ProfileEditForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    {},
  );
  return (
    <form action={formAction} className="mb-card p-6 flex flex-col gap-5">
      <Eyebrow>Display name</Eyebrow>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-3">
          Name
        </span>
        <input
          name="name"
          maxLength={60}
          defaultValue={initialName}
          placeholder="e.g. Arief"
          className="mb-input"
        />
      </label>
      {state?.error && (
        <p className="font-mono text-xs text-[var(--color-down)]">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="font-mono text-xs text-[var(--color-up)]">Saved.</p>
      )}
      <div className="flex gap-3">
        <GoldButton type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </GoldButton>
        <button
          type="button"
          onClick={() => router.back()}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-2 hover:text-gold transition-colors px-4 py-2.5 border border-line hover:border-gold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
