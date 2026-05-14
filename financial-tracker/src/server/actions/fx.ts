"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireMembership } from "@/server/workspace";

const overrideSchema = z.object({
  base: z.enum(["IDR", "USD"]),
  quote: z.enum(["IDR", "USD"]),
  date: z.coerce.date(),
  rate: z.coerce.number().positive(),
});

export type FxActionState = { error?: string };

export async function upsertFxOverride(
  slug: string,
  _prev: FxActionState | undefined,
  formData: FormData,
): Promise<FxActionState> {
  await requireMembership(slug); // gated; FX is workspace-agnostic but require auth
  const parsed = overrideSchema.safeParse({
    base: formData.get("base"),
    quote: formData.get("quote"),
    date: formData.get("date"),
    rate: formData.get("rate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.base === parsed.data.quote) {
    return { error: "Base and quote must differ." };
  }
  const dayStart = new Date(
    Date.UTC(
      parsed.data.date.getUTCFullYear(),
      parsed.data.date.getUTCMonth(),
      parsed.data.date.getUTCDate(),
    ),
  );
  await db.fxRate.upsert({
    where: {
      base_quote_date: {
        base: parsed.data.base,
        quote: parsed.data.quote,
        date: dayStart,
      },
    },
    create: {
      base: parsed.data.base,
      quote: parsed.data.quote,
      date: dayStart,
      rate: parsed.data.rate.toString(),
      source: "manual",
    },
    update: {
      rate: parsed.data.rate.toString(),
      source: "manual",
    },
  });
  revalidatePath(`/app/${slug}/settings/fx`);
  return {};
}

export async function deleteFxOverride(slug: string, id: string) {
  await requireMembership(slug);
  await db.fxRate.deleteMany({ where: { id } });
  revalidatePath(`/app/${slug}/settings/fx`);
}
