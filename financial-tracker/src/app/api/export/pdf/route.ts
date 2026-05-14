import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireMembership } from "@/server/workspace";
import { buildPnl } from "@/server/reports";

export const dynamic = "force-dynamic";

const GOLD = rgb(0.788, 0.659, 0.298); // #C9A84C
const BLACK = rgb(0.04, 0.04, 0.04);
const GRAY = rgb(0.6, 0.6, 0.6);
const DARK_GRAY = rgb(0.18, 0.18, 0.18);

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(n);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const kind = url.searchParams.get("kind") ?? "pnl";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!slug || !from || !to) {
    return new Response("Missing parameters", { status: 400 });
  }
  if (kind !== "pnl") {
    return new Response("Only P&L PDF supported in Phase 0", { status: 400 });
  }

  const { workspace } = await requireMembership(slug);
  const report = await buildPnl(workspace.id, new Date(from), new Date(to));

  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdf.embedFont(StandardFonts.Courier);

  const page = pdf.addPage([595, 842]); // A4
  const { width } = page.getSize();
  const margin = 48;
  let y = 800;

  // MetricBase header
  page.drawText("METRICBASE", {
    x: margin,
    y,
    size: 10,
    font: helvBold,
    color: GOLD,
  });
  page.drawText("FINANCIAL TRACKER", {
    x: margin + 80,
    y,
    size: 10,
    font: helv,
    color: GRAY,
  });

  y -= 30;
  page.drawText("Income Statement", {
    x: margin,
    y,
    size: 22,
    font: helvBold,
    color: BLACK,
  });

  y -= 18;
  page.drawText(
    `${workspace.name}  ·  ${from} → ${to}  ·  Base ${workspace.baseCurrency}`,
    { x: margin, y, size: 10, font: helv, color: DARK_GRAY },
  );

  y -= 14;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    color: GOLD,
    thickness: 1,
  });

  y -= 30;
  page.drawText("INCOME", {
    x: margin,
    y,
    size: 10,
    font: helvBold,
    color: GOLD,
  });
  y -= 16;

  function row(label: string, value: number, font = helv) {
    page.drawText(label, { x: margin, y, size: 11, font, color: BLACK });
    const text = fmt(value, workspace.baseCurrency);
    const w = courier.widthOfTextAtSize(text, 11);
    page.drawText(text, {
      x: width - margin - w,
      y,
      size: 11,
      font: courier,
      color: BLACK,
    });
    y -= 16;
  }

  for (const r of report.income) row(r.name, r.total);
  y -= 4;
  page.drawLine({
    start: { x: margin, y: y + 8 },
    end: { x: width - margin, y: y + 8 },
    color: DARK_GRAY,
    thickness: 0.5,
  });
  row("Total income", report.totalIncome, helvBold);

  y -= 18;
  page.drawText("EXPENSE", {
    x: margin,
    y,
    size: 10,
    font: helvBold,
    color: GOLD,
  });
  y -= 16;

  for (const r of report.expense) row(r.name, r.total);
  y -= 4;
  page.drawLine({
    start: { x: margin, y: y + 8 },
    end: { x: width - margin, y: y + 8 },
    color: DARK_GRAY,
    thickness: 0.5,
  });
  row("Total expense", report.totalExpense, helvBold);

  y -= 30;
  page.drawLine({
    start: { x: margin, y: y + 22 },
    end: { x: width - margin, y: y + 22 },
    color: GOLD,
    thickness: 1.5,
  });
  page.drawText("NET INCOME", {
    x: margin,
    y,
    size: 12,
    font: helvBold,
    color: BLACK,
  });
  const net = fmt(report.netIncome, workspace.baseCurrency);
  const netW = courier.widthOfTextAtSize(net, 14);
  page.drawText(net, {
    x: width - margin - netW,
    y: y - 1,
    size: 14,
    font: courier,
    color: report.netIncome >= 0 ? rgb(0.184, 0.686, 0.396) : rgb(0.831, 0.322, 0.29),
  });

  // Footer
  page.drawText(
    `Generated ${new Date().toISOString().slice(0, 10)} · metricbase.org`,
    {
      x: margin,
      y: 40,
      size: 8,
      font: helv,
      color: GRAY,
    },
  );

  const bytes = await pdf.save();
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="metricbase-pnl-${slug}-${from}-to-${to}.pdf"`,
    },
  });
}
