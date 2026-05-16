export type DashboardPeriod = "mtd" | "3m" | "6m" | "ytd" | "1y";

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  mtd: "This month",
  "3m": "3 months",
  "6m": "6 months",
  ytd: "Year to date",
  "1y": "12 months",
};
