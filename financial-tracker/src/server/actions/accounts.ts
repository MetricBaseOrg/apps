"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireMembership } from "@/server/workspace";
import { finAccountSchema } from "@/lib/schemas";

export type AccountActionState = { error?: string };

export async function createAccount(
  slug: string,
  _prev: AccountActionState | undefined,
  formData: FormData,
): Promise<AccountActionState> {
  const { workspace } = await requireMembership(slug);
  const parsed = finAccountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    currency: formData.get("currency"),
    openingBalance: formData.get("openingBalance") ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await db.finAccount.create({
    data: {
      workspaceId: workspace.id,
      name: parsed.data.name,
      type: parsed.data.type,
      currency: parsed.data.currency,
      openingBalance: parsed.data.openingBalance,
    },
  });
  revalidatePath(`/app/${slug}/accounts`);
  return {};
}

const updateSchema = finAccountSchema.partial().extend({
  id: z.string().min(1),
});

export async function updateAccount(slug: string, formData: FormData) {
  const { workspace } = await requireMembership(slug);
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    type: formData.get("type") || undefined,
    currency: formData.get("currency") || undefined,
    openingBalance:
      formData.get("openingBalance") !== null
        ? formData.get("openingBalance")
        : undefined,
  });
  if (!parsed.success) return;
  const { id, ...rest } = parsed.data;
  await db.finAccount.updateMany({
    where: { id, workspaceId: workspace.id },
    data: rest,
  });
  revalidatePath(`/app/${slug}/accounts`);
}

export async function archiveAccount(slug: string, id: string) {
  const { workspace } = await requireMembership(slug);
  await db.finAccount.updateMany({
    where: { id, workspaceId: workspace.id },
    data: { archivedAt: new Date() },
  });
  revalidatePath(`/app/${slug}/accounts`);
}

export async function unarchiveAccount(slug: string, id: string) {
  const { workspace } = await requireMembership(slug);
  await db.finAccount.updateMany({
    where: { id, workspaceId: workspace.id },
    data: { archivedAt: null },
  });
  revalidatePath(`/app/${slug}/accounts`);
}
