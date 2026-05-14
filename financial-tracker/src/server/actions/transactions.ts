"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import Decimal from "decimal.js";
import { db } from "@/server/db";
import { requireMembership } from "@/server/workspace";
import { getFxRate } from "@/server/fx/provider";

const baseSchema = z.object({
  date: z.coerce.date(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  finAccountId: z.string().min(1),
  amount: z.coerce.number().positive(),
  memo: z.string().max(200).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  counterAccountId: z.string().optional().nullable(),
});

export type TxnActionState = { error?: string };

export async function createTransaction(
  slug: string,
  _prev: TxnActionState | undefined,
  formData: FormData,
): Promise<TxnActionState> {
  const { workspace } = await requireMembership(slug);
  const parsed = baseSchema.safeParse({
    date: formData.get("date"),
    type: formData.get("type"),
    finAccountId: formData.get("finAccountId"),
    amount: formData.get("amount"),
    memo: formData.get("memo") || null,
    categoryId: formData.get("categoryId") || null,
    counterAccountId: formData.get("counterAccountId") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  if (input.type === "TRANSFER" && !input.counterAccountId) {
    return { error: "Transfers require a destination account." };
  }
  if (input.type === "TRANSFER" && input.counterAccountId === input.finAccountId) {
    return { error: "Source and destination must differ." };
  }

  const primary = await db.finAccount.findFirst({
    where: { id: input.finAccountId, workspaceId: workspace.id },
  });
  if (!primary) return { error: "Source account not found." };

  let counter = null as Awaited<ReturnType<typeof db.finAccount.findFirst>> | null;
  if (input.counterAccountId) {
    counter = await db.finAccount.findFirst({
      where: { id: input.counterAccountId, workspaceId: workspace.id },
    });
    if (!counter) return { error: "Destination account not found." };
  }

  // INCOME/EXPENSE: amount is in primary.currency
  // TRANSFER: amount is debited from primary in primary.currency
  // FX rate: convert primary.currency → workspace.baseCurrency on `date`
  let fxRate: Decimal;
  try {
    fxRate = await getFxRate(primary.currency, workspace.baseCurrency, input.date);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "FX lookup failed" };
  }

  const amount = new Decimal(input.amount);
  const baseAmount = amount.times(fxRate);

  await db.transaction.create({
    data: {
      workspaceId: workspace.id,
      finAccountId: primary.id,
      counterAccountId: counter?.id,
      categoryId:
        input.type === "TRANSFER" ? null : input.categoryId || null,
      date: input.date,
      amount: amount.toString(),
      currency: primary.currency,
      fxRate: fxRate.toString(),
      baseAmount: baseAmount.toString(),
      type: input.type,
      memo: input.memo || null,
    },
  });

  revalidatePath(`/app/${slug}/transactions`);
  revalidatePath(`/app/${slug}/dashboard`);
  return {};
}

export async function deleteTransaction(slug: string, id: string) {
  const { workspace } = await requireMembership(slug);
  await db.transaction.deleteMany({
    where: { id, workspaceId: workspace.id },
  });
  revalidatePath(`/app/${slug}/transactions`);
  revalidatePath(`/app/${slug}/dashboard`);
}
