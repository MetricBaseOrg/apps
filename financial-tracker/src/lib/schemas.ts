import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "./constants";

export const finAccountSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(["BANK", "CASH", "CRYPTO", "BROKERAGE", "CREDIT", "OTHER"]),
  currency: z.enum(SUPPORTED_CURRENCIES),
  openingBalance: z.coerce.number().finite(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(60),
  kind: z.enum(["INCOME", "EXPENSE"]),
  monthlyBudget: z
    .union([z.literal(""), z.coerce.number().nonnegative()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  color: z.string().max(20).optional().nullable(),
});

export type FinAccountInput = z.infer<typeof finAccountSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
