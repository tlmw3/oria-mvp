"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface WeekData {
  weekStart: string;
  distanceKm: number;
  goalMet: boolean;
}

interface Props {
  data: WeekData[];
  targetKm: number;
}

export function ProgressChart({ data, targetKm }: Props) {
  const chartData = data.map((d) => ({
    week: new Date(d.weekStart).toLocaleDateString("en", { month: "short", day: "numeric" }),
    km: Math.round(d.distanceKm * 10) / 10,
    goalMet: d.goalMet,
  })).reverse(); // oldest first

  return (
    <div className="w-full h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 14, right: 16, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="kmGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fill: "#64697A", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            // interval=0 forces every label to render; the default heuristic
            // was dropping the second-to-last tick to avoid overlap with the
            // ReferenceLine label on the right.
            interval={0}
          />
          <YAxis
            tick={{ fill: "#64697A", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15,15,22,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              fontSize: "12px",
              color: "#F5F5F7",
              backdropFilter: "blur(12px)",
            }}
            formatter={(value) => [`${value} km`, "Distance"]}
            labelStyle={{ color: "#64697A", fontSize: "11px" }}
          />
          <ReferenceLine
            y={targetKm}
            stroke="#F59E0B"
            strokeDasharray="4 4"
            strokeWidth={1}
            // insideTopRight keeps the label inside the chart area so it
            // doesn't overlap the last X-axis tick (which used to swallow
            // the latest week's date).
            label={{
              value: `${targetKm}km goal`,
              fill: "#F59E0B",
              fontSize: 10,
              position: "insideTopRight",
              offset: 4,
            }}
          />
          <Area
            type="monotone"
            dataKey="km"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#kmGradient)"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dot={(props: Record<string, any>) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={payload.goalMet ? "#10B981" : "#FC4C02"}
                  stroke="none"
                />
              );
            }}
            activeDot={{ r: 5, fill: "#A78BFA", stroke: "#F5F5F7", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
