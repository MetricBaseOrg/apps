"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/server/actions/profile";
import { GoldButton } from "@/components/mb/GoldButton";
import { Eyebrow } from "@/components/mb/Eyebrow";

export function ProfileEditForm({ initialName }: { initialName: string }) {
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
      <GoldButton type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </GoldButton>
    </form>
  );
}
