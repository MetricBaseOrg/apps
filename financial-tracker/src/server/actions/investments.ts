"use server";

import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireMembership } from "@/server/workspace";
import { logAudit } from "@/server/audit";
import { getFxRate } from "@/server/fx/provider";
import { DIVIDEND_CATEGORY_NAME } from "@/lib/constants";
import {
  positionCreateSchema,
  lotBuySchema,
  lotSellSchema,
  dividendSchema,
  positionPriceSchema,
} from "@/lib/schemas";

export type InvestmentActionState = { error?: string };

async function ensureDividendCategory(workspaceId: string): Promise<string> {
  const existing = await db.category.findFirst({
    where: { workspaceId, name: DIVIDEND_CATEGORY_NAME, kind: "INCOME" },
  });
  if (existing) return existing.id;
  const created = await db.category.create({
    data: { workspaceId, name: DIVIDEND_CATEGORY_NAME, kind: "INCOME" },
  });
  return created.id;
}

function revalidateInvestments(slug: string) {
  revalidatePath(`/app/${slug}/investments`);
}

export async function createPosition(
  slug: string,
  _prev: InvestmentActionState | undefined,
  formData: FormData,
): Promise<InvestmentActionState> {
  const { user, workspace } = await requireMembership(slug);
  const parsed = positionCreateSchema.safeParse({
    finAccountId: formData.get("finAccountId"),
    symbol: formData.get("symbol"),
    name: formData.get("name") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const account = await db.finAccount.findFirst({
    where: { id: parsed.data.finAccountId, workspaceId: workspace.id },
  });
  if (!account) return { error: "Brokerage account not found." };
  if (account.type !== "BROKERAGE") {
    return { error: "Positions must be held in a BROKERAGE account." };
  }
  const position = await db.investmentPosition.create({
    data: {
      workspaceId: workspace.id,
      finAccountId: account.id,
      symbol: parsed.data.symbol,
      name: parsed.data.name ?? undefined,
      currency: account.currency,
    },
  });
  await logAudit({
    workspaceId: workspace.id,
    userId: user.id,
    action: "CREATE",
    entityType: "INVESTMENT_POSITION",
    entityId: position.id,
    summary: `Opened position ${position.symbol}`,
  });
  revalidateInvestments(slug);
  return {};
}

export async function recordBuy(
  slug: string,
  _prev: InvestmentActionState | undefined,
  formData: FormData,
): Promise<InvestmentActionState> {
  const { user, workspace } = await requireMembership(slug);
  const parsed = lotBuySchema.safeParse({
    positionId: formData.get("positionId"),
    quantity: formData.get("quantity"),
    costPerUnit: formData.get("costPerUnit"),
    fees: formData.get("fees") ?? "",
    acquiredAt: formData.get("acquiredAt"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const position = await db.investmentPosition.findFirst({
    where: { id: parsed.data.positionId, workspaceId: workspace.id },
  });
  if (!position) return { error: "Position not found." };

  const qty = new Decimal(parsed.data.quantity);
  await db.investmentLot.create({
    data: {
      positionId: position.id,
      quantity: qty.toString(),
      remainingQuantity: qty.toString(),
      costPerUnit: new Decimal(parsed.data.costPerUnit).toString(),
      fees: parsed.data.fees != null ? new Decimal(parsed.data.fees).toString() : undefined,
      acquiredAt: parsed.data.acquiredAt,
    },
  });
  await logAudit({
    workspaceId: workspace.id,
    userId: user.id,
    action: "INVESTMENT_BUY",
    entityType: "INVESTMENT_POSITION",
    entityId: position.id,
    summary: `Bought ${qty.toString()} ${position.symbol} @ ${parsed.data.costPerUnit}`,
    metadata: { quantity: qty.toString(), costPerUnit: parsed.data.costPerUnit },
  });
  revalidateInvestments(slug);
  return {};
}

export async function recordSell(
  slug: string,
  _prev: InvestmentActionState | undefined,
  formData: FormData,
): Promise<InvestmentActionState> {
  const { user, workspace } = await requireMembership(slug);
  const parsed = lotSellSchema.safeParse({
    positionId: formData.get("positionId"),
    quantity: formData.get("quantity"),
    pricePerUnit: formData.get("pricePerUnit"),
    fees: formData.get("fees") ?? "",
    soldAt: formData.get("soldAt"),
    postTransaction: formData.get("postTransaction") ?? false,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const position = await db.investmentPosition.findFirst({
    where: { id: parsed.data.positionId, workspaceId: workspace.id },
  });
  if (!position) return { error: "Position not found." };

  const openLots = await db.investmentLot.findMany({
    where: { positionId: position.id },
    orderBy: [{ acquiredAt: "asc" }, { createdAt: "asc" }],
  });

  const sellQty = new Decimal(parsed.data.quantity);
  const totalRemaining = openLots.reduce(
    (acc, l) => acc.plus(new Decimal(l.remainingQuantity.toString())),
    new Decimal(0),
  );
  if (sellQty.gt(totalRemaining)) {
    return {
      error: `Cannot sell ${sellQty.toString()} units; only ${totalRemaining.toString()} held.`,
    };
  }

  let toSell = sellQty;
  let consumedCost = new Decimal(0);
  const lotUpdates: { id: string; remaining: string }[] = [];
  for (const lot of openLots) {
    if (toSell.lte(0)) break;
    const lotRemaining = new Decimal(lot.remainingQuantity.toString());
    if (lotRemaining.lte(0)) continue;
    const take = Decimal.min(lotRemaining, toSell);
    consumedCost = consumedCost.plus(
      take.times(new Decimal(lot.costPerUnit.toString())),
    );
    lotUpdates.push({
      id: lot.id,
      remaining: lotRemaining.minus(take).toString(),
    });
    toSell = toSell.minus(take);
  }

  const fees = parsed.data.fees != null ? new Decimal(parsed.data.fees) : new Decimal(0);
  const gross = sellQty.times(new Decimal(parsed.data.pricePerUnit));
  const netProceeds = gross.minus(fees);
  const realizedPl = netProceeds.minus(consumedCost);

  let fxRate: Decimal | null = null;
  if (parsed.data.postTransaction) {
    try {
      fxRate = await getFxRate(
        position.currency,
        workspace.baseCurrency,
        parsed.data.soldAt,
      );
    } catch (e) {
      return { error: e instanceof Error ? e.message : "FX lookup failed" };
    }
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [
    ...lotUpdates.map((u) =>
      db.investmentLot.update({
        where: { id: u.id },
        data: { remainingQuantity: u.remaining },
      }),
    ),
    db.investmentPosition.update({
      where: { id: position.id },
      data: { realizedPl: { increment: realizedPl.toString() } },
    }),
  ];
  if (parsed.data.postTransaction && fxRate) {
    ops.push(
      db.transaction.create({
        data: {
          workspaceId: workspace.id,
          finAccountId: position.finAccountId,
          date: parsed.data.soldAt,
          amount: netProceeds.toString(),
          currency: position.currency,
          fxRate: fxRate.toString(),
          baseAmount: netProceeds.times(fxRate).toString(),
          type: "INCOME",
          memo: `Sold ${sellQty.toString()} ${position.symbol} @ ${parsed.data.pricePerUnit}`,
        },
      }),
    );
  }
  await db.$transaction(ops);

  await logAudit({
    workspaceId: workspace.id,
    userId: user.id,
    action: "INVESTMENT_SELL",
    entityType: "INVESTMENT_POSITION",
    entityId: position.id,
    summary: `Sold ${sellQty.toString()} ${position.symbol} @ ${parsed.data.pricePerUnit} (realized ${realizedPl.toString()})`,
    metadata: {
      quantity: sellQty.toString(),
      pricePerUnit: parsed.data.pricePerUnit,
      realizedPl: realizedPl.toString(),
      proceeds: netProceeds.toString(),
      costBasis: consumedCost.toString(),
    },
  });
  revalidateInvestments(slug);
  revalidatePath(`/app/${slug}/dashboard`);
  revalidatePath(`/app/${slug}/transactions`);
  return {};
}

export async function recordDividend(
  slug: string,
  _prev: InvestmentActionState | undefined,
  formData: FormData,
): Promise<InvestmentActionState> {
  const { user, workspace } = await requireMembership(slug);
  const parsed = dividendSchema.safeParse({
    positionId: formData.get("positionId"),
    totalAmount: formData.get("totalAmount"),
    payDate: formData.get("payDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const position = await db.investmentPosition.findFirst({
    where: { id: parsed.data.positionId, workspaceId: workspace.id },
  });
  if (!position) return { error: "Position not found." };

  let fxRate: Decimal;
  try {
    fxRate = await getFxRate(
      position.currency,
      workspace.baseCurrency,
      parsed.data.payDate,
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "FX lookup failed" };
  }

  const categoryId = await ensureDividendCategory(workspace.id);
  const amount = new Decimal(parsed.data.totalAmount);

  const txn = await db.transaction.create({
    data: {
      workspaceId: workspace.id,
      finAccountId: position.finAccountId,
      categoryId,
      date: parsed.data.payDate,
      amount: amount.toString(),
      currency: position.currency,
      fxRate: fxRate.toString(),
      baseAmount: amount.times(fxRate).toString(),
      type: "INCOME",
      memo: `Dividend · ${position.symbol}`,
      dividend: {
        create: {
          positionId: position.id,
          totalAmount: amount.toString(),
          currency: position.currency,
          payDate: parsed.data.payDate,
        },
      },
    },
  });

  await logAudit({
    workspaceId: workspace.id,
    userId: user.id,
    action: "INVESTMENT_DIVIDEND",
    entityType: "DIVIDEND",
    entityId: txn.id,
    summary: `Dividend ${amount.toString()} ${position.currency} from ${position.symbol}`,
    metadata: { positionId: position.id, totalAmount: amount.toString() },
  });
  revalidateInvestments(slug);
  revalidatePath(`/app/${slug}/dashboard`);
  revalidatePath(`/app/${slug}/transactions`);
  return {};
}

export async function updatePositionPrice(
  slug: string,
  _prev: InvestmentActionState | undefined,
  formData: FormData,
): Promise<InvestmentActionState> {
  const { user, workspace } = await requireMembership(slug);
  const parsed = positionPriceSchema.safeParse({
    positionId: formData.get("positionId"),
    lastPrice: formData.get("lastPrice"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const position = await db.investmentPosition.findFirst({
    where: { id: parsed.data.positionId, workspaceId: workspace.id },
  });
  if (!position) return { error: "Position not found." };
  await db.investmentPosition.update({
    where: { id: position.id },
    data: {
      lastPrice: new Decimal(parsed.data.lastPrice).toString(),
      lastPriceAt: new Date(),
    },
  });
  await logAudit({
    workspaceId: workspace.id,
    userId: user.id,
    action: "UPDATE",
    entityType: "INVESTMENT_POSITION",
    entityId: position.id,
    summary: `Updated ${position.symbol} price to ${parsed.data.lastPrice}`,
  });
  revalidateInvestments(slug);
  return {};
}

export async function closePosition(
  slug: string,
  positionId: string,
): Promise<InvestmentActionState> {
  const { user, workspace } = await requireMembership(slug);
  const position = await db.investmentPosition.findFirst({
    where: { id: positionId, workspaceId: workspace.id },
    include: { lots: true },
  });
  if (!position) return { error: "Position not found." };
  const open = position.lots.reduce(
    (acc, l) => acc.plus(new Decimal(l.remainingQuantity.toString())),
    new Decimal(0),
  );
  if (open.gt(0)) {
    return { error: "Sell all holdings before closing the position." };
  }
  await db.investmentPosition.update({
    where: { id: position.id },
    data: { closedAt: new Date() },
  });
  await logAudit({
    workspaceId: workspace.id,
    userId: user.id,
    action: "UPDATE",
    entityType: "INVESTMENT_POSITION",
    entityId: position.id,
    summary: `Closed position ${position.symbol}`,
  });
  revalidateInvestments(slug);
  return {};
}
