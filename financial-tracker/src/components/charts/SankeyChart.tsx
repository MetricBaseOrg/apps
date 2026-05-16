"use client";

import { Sankey, Tooltip, ResponsiveContainer } from "recharts";
import type { SankeyNode, SankeyLink } from "@/server/analytics";

const NODE_COLOR = "#c9a84c";
const LINK_COLOR = "rgba(201,168,76,0.18)";
const LINK_ACTIVE = "rgba(201,168,76,0.35)";

function SankeyNodeShape({
  x, y, width, height, payload,
}: {
  x: number; y: number; width: number; height: number;
  payload: { name: string };
}) {
  const isYou = payload.name === "You";
  return (
    <g>
      <rect
        x={x} y={y} width={width} height={height}
        fill={isYou ? "#e5c168" : NODE_COLOR}
        opacity={isYou ? 1 : 0.85}
      />
      <text
        x={x + width + 6} y={y + height / 2}
        fill="#e5e5e5"
        fontSize={10}
        fontFamily="var(--font-mono)"
        dominantBaseline="middle"
        letterSpacing="0.1em"
      >
        {payload.name}
      </text>
    </g>
  );
}

export function SankeyChart({
  nodes,
  links,
  currency,
}: {
  nodes: SankeyNode[];
  links: SankeyLink[];
  currency: string;
}) {
  if (nodes.length < 2 || links.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-gray-3 font-mono text-xs uppercase tracking-[0.2em]">
        Not enough data for flow chart
      </div>
    );
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={{ nodes, links }}
          nodePadding={12}
          nodeWidth={10}
          margin={{ left: 8, right: 120, top: 8, bottom: 8 }}
          link={{ stroke: LINK_COLOR, strokeOpacity: 1 }}
          node={<SankeyNodeShape x={0} y={0} width={0} height={0} payload={{ name: "" }} />}
        >
          <Tooltip
            contentStyle={{
              background: "#161616",
              border: "1px solid rgba(201,168,76,0.3)",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
            }}
            formatter={(value) => [fmt(Number(value)), ""]}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
