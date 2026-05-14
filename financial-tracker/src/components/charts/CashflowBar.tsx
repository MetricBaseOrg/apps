"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function CashflowBar({
  data,
  currency,
}: {
  data: { month: string; income: number; expense: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="month"
          stroke="#999999"
          tickFormatter={(m) => m.slice(5)}
          tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="#999999"
          tickFormatter={(v) =>
            new Intl.NumberFormat("en-US", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(Number(v))
          }
          tick={{ fontFamily: "var(--font-mono)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: "#161616",
            border: "1px solid rgba(201,168,76,0.3)",
            borderRadius: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
          formatter={(v) =>
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency,
              maximumFractionDigits: 0,
            }).format(Number(v))
          }
        />
        <Legend
          wrapperStyle={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
          }}
        />
        <Bar dataKey="income" fill="#2faf65" />
        <Bar dataKey="expense" fill="#d4524a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
