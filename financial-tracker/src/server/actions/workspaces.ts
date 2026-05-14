"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireUser, slugify } from "@/server/workspace";
import {
  DEFAULT_COMPANY_CATEGORIES,
  DEFAULT_INDIVIDUAL_CATEGORIES,
  SUPPORTED_CURRENCIES,
} from "@/lib/constants";

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(60),
  type: z.enum(["INDIVIDUAL", "COMPANY"]),
  baseCurrency: z.enum(SUPPORTED_CURRENCIES),
});

export type CreateWorkspaceState = { error?: string };

export async function createWorkspace(
  _prev: CreateWorkspaceState | undefined,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const user = await requireUser();
  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    baseCurrency: formData.get("baseCurrency"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, type, baseCurrency } = parsed.data;

  // Generate a unique slug
  const baseSlug = slugify(name);
  let slug = baseSlug;
  for (let i = 1; i < 50; i++) {
    const existing = await db.workspace.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${baseSlug}-${i}`;
  }

  const defaults =
    type === "COMPANY"
      ? DEFAULT_COMPANY_CATEGORIES
      : DEFAULT_INDIVIDUAL_CATEGORIES;

  const workspace = await db.workspace.create({
    data: {
      name,
      slug,
      type,
      baseCurrency,
      memberships: {
        create: { userId: user.id, role: "OWNER" },
      },
      categories: {
        create: [
          ...defaults.income.map((n) => ({ name: n, kind: "INCOME" as const })),
          ...defaults.expense.map((n) => ({ name: n, kind: "EXPENSE" as const })),
        ],
      },
    },
  });

  revalidatePath("/app");
  redirect(`/app/${workspace.slug}/dashboard`);
}
