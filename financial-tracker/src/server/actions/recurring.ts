"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { db } from "@/server/db";
import { requireMembership } from "@/server/workspace";
import { getFxRate } from "@/server/fx/provider";

const recurringRuleSchema = z.object({
  finAccountId: z.string().cuid(),
  counterAccountId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).toUpperCase(),
  memo: z.string().optional(),
  freq: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  interval: z.coerce.number().int().positive().default(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
});

export type RecurringState = { error?: string; success?: boolean };

function addIntervalToDate(date: Date, interval: number, freq: string): Date {
  const d = new Date(date);
  switch (freq) {
    case "DAILY":
      d.setDate(d.getDate() + interval);
      break;
    case "WEEKLY":
      d.setDate(d.getDate() + interval * 7);
      break;
    case "MONTHLY":
      d.setMonth(d.getMonth() + interval);
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + interval);
      break;
  }
  return d;
}

export async function createRecurringRule(
  slug: string,
  _prev: RecurringState | undefined,
  formData: FormData,
): Promise<RecurringState> {
  const { workspace } = await requireMembership(slug, "ADMIN");

  const parsed = recurringRuleSchema.safeParse({
    finAccountId: formData.get("finAccountId"),
    counterAccountId: formData.get("counterAccountId") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    type: formData.get("type"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    memo: formData.get("memo"),
    freq: formData.get("freq"),
    interval: formData.get("interval"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const finAccount = await db.finAccount.findFirst({
    where: { id: parsed.data.finAccountId, workspaceId: workspace.id },
  });
  if (!finAccount) {
    return { error: "Account not found" };
  }

  if (parsed.data.counterAccountId) {
    const counterAccount = await db.finAccount.findFirst({
      where: { id: parsed.data.counterAccountId, workspaceId: workspace.id },
    });
    if (!counterAccount) {
      return { error: "Counter account not found" };
    }
  }

  if (parsed.data.categoryId) {
    const category = await db.category.findFirst({
      where: { id: parsed.data.categoryId, workspaceId: workspace.id },
    });
    if (!category) {
      return { error: "Category not found" };
    }
  }

  await db.recurringRule.create({
    data: {
      workspaceId: workspace.id,
      finAccountId: parsed.data.finAccountId,
      counterAccountId: parsed.data.counterAccountId || undefined,
      categoryId: parsed.data.categoryId || undefined,
      type: parsed.data.type as "INCOME" | "EXPENSE" | "TRANSFER",
      amount: new Decimal(parsed.data.amount),
      currency: parsed.data.currency,
      memo: parsed.data.memo,
      freq: parsed.data.freq as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
      interval: parsed.data.interval,
      startDate: parsed.data.startDate,
      nextRunDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    },
  });

  revalidatePath(`/app/${slug}/recurring`);
  revalidatePath(`/app/${slug}/transactions`);
  revalidatePath(`/app/${slug}/dashboard`);
  return { success: true };
}

export async function updateRecurringRule(
  slug: string,
  ruleId: string,
  _prev: RecurringState | undefined,
  formData: FormData,
): Promise<RecurringState> {
  const { workspace } = await requireMembership(slug, "ADMIN");

  const rule = await db.recurringRule.findFirst({
    where: { id: ruleId, workspaceId: workspace.id },
  });
  if (!rule) {
    return { error: "Rule not found" };
  }

  const parsed = recurringRuleSchema.safeParse({
    finAccountId: formData.get("finAccountId"),
    counterAccountId: formData.get("counterAccountId") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    type: formData.get("type"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    memo: formData.get("memo"),
    freq: formData.get("freq"),
    interval: formData.get("interval"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const finAccount = await db.finAccount.findFirst({
    where: { id: parsed.data.finAccountId, workspaceId: workspace.id },
  });
  if (!finAccount) {
    return { error: "Account not found" };
  }

  if (parsed.data.counterAccountId) {
    const counterAccount = await db.finAccount.findFirst({
      where: { id: parsed.data.counterAccountId, workspaceId: workspace.id },
    });
    if (!counterAccount) {
      return { error: "Counter account not found" };
    }
  }

  if (parsed.data.categoryId) {
    const category = await db.category.findFirst({
      where: { id: parsed.data.categoryId, workspaceId: workspace.id },
    });
    if (!category) {
      return { error: "Category not found" };
    }
  }

  await db.recurringRule.update({
    where: { id: ruleId },
    data: {
      finAccountId: parsed.data.finAccountId,
      counterAccountId: parsed.data.counterAccountId || undefined,
      categoryId: parsed.data.categoryId || undefined,
      type: parsed.data.type as "INCOME" | "EXPENSE" | "TRANSFER",
      amount: new Decimal(parsed.data.amount),
      currency: parsed.data.currency,
      memo: parsed.data.memo,
      freq: parsed.data.freq as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
      interval: parsed.data.interval,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    },
  });

  revalidatePath(`/app/${slug}/recurring`);
  revalidatePath(`/app/${slug}/transactions`);
  revalidatePath(`/app/${slug}/dashboard`);
  return { success: true };
}

export async function deleteRecurringRule(
  slug: string,
  ruleId: string,
): Promise<RecurringState> {
  const { workspace } = await requireMembership(slug, "ADMIN");

  const rule = await db.recurringRule.findFirst({
    where: { id: ruleId, workspaceId: workspace.id },
  });
  if (!rule) {
    return { error: "Rule not found" };
  }

  await db.recurringRule.delete({ where: { id: ruleId } });

  revalidatePath(`/app/${slug}/recurring`);
  revalidatePath(`/app/${slug}/transactions`);
  revalidatePath(`/app/${slug}/dashboard`);
  return { success: true };
}

export async function postDueRules(
  slug: string,
): Promise<RecurringState & { count?: number }> {
  const { workspace } = await requireMembership(slug, "ADMIN");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueRules = await db.recurringRule.findMany({
    where: {
      workspaceId: workspace.id,
      nextRunDate: { lte: today },
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
  });

  let createdCount = 0;

  for (const rule of dueRules) {
    let nextRun = new Date(rule.nextRunDate);

    while (
      nextRun <= today &&
      (!rule.endDate || nextRun <= rule.endDate)
    ) {
      const primaryAcct = await db.finAccount.findUnique({
        where: { id: rule.finAccountId },
      });
      if (!primaryAcct) continue;

      const fxRate = await getFxRate(
        rule.currency,
        workspace.baseCurrency,
        nextRun,
      );

      const amount = new Decimal(rule.amount);
      const baseAmount = amount.mul(fxRate);

      await db.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            workspaceId: workspace.id,
            finAccountId: rule.finAccountId,
            counterAccountId: rule.counterAccountId || undefined,
            categoryId: rule.categoryId || undefined,
            date: nextRun,
            amount,
            currency: rule.currency,
            fxRate,
            baseAmount,
            type: rule.type as "INCOME" | "EXPENSE" | "TRANSFER",
            memo: rule.memo,
          },
        });

        await tx.recurringRule.update({
          where: { id: rule.id },
          data: { lastPostedAt: nextRun },
        });
      });

      createdCount++;
      nextRun = addIntervalToDate(nextRun, rule.interval, rule.freq);
    }

    await db.recurringRule.update({
      where: { id: rule.id },
      data: { nextRunDate: nextRun },
    });
  }

  revalidatePath(`/app/${slug}/recurring`);
  revalidatePath(`/app/${slug}/transactions`);
  revalidatePath(`/app/${slug}/dashboard`);
  return { success: true, count: createdCount };
}
