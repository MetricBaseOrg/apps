"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { db } from "@/server/db";
import { requireMembership } from "@/server/workspace";
import { getFxRate } from "@/server/fx/provider";

const tradeSchema = z.object({
  finAccountId: z.string().cuid(),
  symbol: z.string().min(1).max(20).toUpperCase(),
  unitKind: z.enum(["SHARES", "TOKENS", "LOTS"]),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().positive(),
  fee: z.union([z.literal(""), z.coerce.number().nonnegative()]).transform((v) =>
    v === "" ? 0 : v,
  ),
  date: z.coerce.date(),
});

export type InvestmentState = { error?: string; success?: boolean };

export async function recordTrade(
  slug: string,
  _prev: InvestmentState | undefined,
  formData: FormData,
): Promise<InvestmentState> {
  console.log("[recordTrade] Starting with slug:", slug);
  const { workspace } = await requireMembership(slug, "ADMIN");
  console.log("[recordTrade] Workspace found:", workspace.id);

  const parsed = tradeSchema.safeParse({
    finAccountId: formData.get("finAccountId"),
    symbol: formData.get("symbol"),
    unitKind: formData.get("unitKind"),
    side: formData.get("side"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    fee: formData.get("fee"),
    date: formData.get("date"),
  });

  if (!parsed.success) {
    console.log("[recordTrade] Schema validation failed:", parsed.error.issues[0]?.message);
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  console.log("[recordTrade] Schema validation passed, data:", parsed.data);

  const finAccount = await db.finAccount.findFirst({
    where: { id: parsed.data.finAccountId, workspaceId: workspace.id },
  });
  if (!finAccount) {
    console.log("[recordTrade] Account not found:", parsed.data.finAccountId);
    return { error: "Account not found" };
  }
  console.log("[recordTrade] Account found:", finAccount.id, "type:", finAccount.type);

  if (finAccount.type !== "BROKERAGE" && finAccount.type !== "CRYPTO") {
    console.log("[recordTrade] Invalid account type:", finAccount.type);
    return {
      error: "Only BROKERAGE and CRYPTO accounts support investment tracking",
    };
  }

  console.log("[recordTrade] Getting FX rate...");
  const quantity = new Decimal(parsed.data.quantity);
  const unitPrice = new Decimal(parsed.data.unitPrice);
  const fee = new Decimal(parsed.data.fee);
  const fxRate = await getFxRate(
    finAccount.currency,
    workspace.baseCurrency,
    parsed.data.date,
  );
  console.log("[recordTrade] FX rate:", fxRate);

  let amount: Decimal;
  if (parsed.data.side === "BUY") {
    amount = quantity.mul(unitPrice).add(fee);
  } else {
    amount = quantity.mul(unitPrice).minus(fee);
  }

  const baseAmount = amount.mul(fxRate);
  console.log("[recordTrade] Amount:", amount.toString(), "BaseAmount:", baseAmount.toString());

  try {
    console.log("[recordTrade] Starting transaction...");
    const result = await db.$transaction(async (tx) => {
      console.log("[recordTrade] Inside transaction, upserting position...");
      const position = await tx.position.upsert({
        where: {
          finAccountId_symbol: {
            finAccountId: parsed.data.finAccountId,
            symbol: parsed.data.symbol,
          },
        },
        create: {
          workspaceId: workspace.id,
          finAccountId: parsed.data.finAccountId,
          symbol: parsed.data.symbol,
          unitKind: parsed.data.unitKind as "SHARES" | "TOKENS" | "LOTS",
        },
        update: {
          unitKind: parsed.data.unitKind as "SHARES" | "TOKENS" | "LOTS",
        },
      });
      console.log("[recordTrade] Position upserted:", position.id);

      const txn = await tx.transaction.create({
        data: {
          workspaceId: workspace.id,
          finAccountId: parsed.data.finAccountId,
          date: parsed.data.date,
          amount,
          currency: finAccount.currency,
          fxRate,
          baseAmount,
          type: parsed.data.side === "BUY" ? "EXPENSE" : "INCOME",
          positionId: position.id,
        },
      });
      console.log("[recordTrade] Transaction created:", txn.id);

      if (parsed.data.side === "BUY") {
        await tx.lot.create({
          data: {
            positionId: position.id,
            transactionId: txn.id,
            side: "BUY",
            quantity,
            unitCost: unitPrice,
            fee,
            remainingQty: quantity,
            acquiredDate: parsed.data.date,
          },
        });
        console.log("[recordTrade] Lot created for BUY");
      } else {
        const openLots = await tx.lot.findMany({
          where: { positionId: position.id, side: "BUY", closedAt: null },
          orderBy: { acquiredDate: "asc" },
        });

        let remaining = quantity;
        for (const lot of openLots) {
          if (remaining.isZero()) break;

          const consumed = remaining.greaterThan(lot.remainingQty)
            ? lot.remainingQty
            : remaining;

          await tx.lot.update({
            where: { id: lot.id },
            data: {
              remainingQty: lot.remainingQty.minus(consumed),
              closedAt: lot.remainingQty.equals(consumed) ? parsed.data.date : null,
            },
          });

          remaining = remaining.minus(consumed);
        }

        if (remaining.greaterThan(0)) {
          return { error: "Insufficient holdings to sell" };
        }

        await tx.lot.create({
          data: {
            positionId: position.id,
            transactionId: txn.id,
            side: "SELL",
            quantity,
            unitCost: unitPrice,
            fee,
            remainingQty: new Decimal(0),
            acquiredDate: parsed.data.date,
            closedAt: parsed.data.date,
          },
        });
      }

      console.log("[recordTrade] Transaction complete, returning success");
      return { success: true };
    });

    console.log("[recordTrade] Transaction result:", result);
    if (result.success) {
      console.log("[recordTrade] Revalidating paths...");
      revalidatePath(`/app/${slug}/investments`);
      revalidatePath(`/app/${slug}/transactions`);
      revalidatePath(`/app/${slug}/dashboard`);
      console.log("[recordTrade] Paths revalidated");
    }

    console.log("[recordTrade] Returning result:", result);
    return result;
  } catch (error) {
    console.error("Trade recording error:", error);
    return { error: "Failed to record trade. Please try again." };
  }
}
