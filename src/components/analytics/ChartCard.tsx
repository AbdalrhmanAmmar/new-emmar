import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { int, money } from "@/lib/format";
import type { SeriesPoint } from "@/lib/analytics";

export const CHART_COLORS = [
  "hsl(var(--chart-1, 152 45% 30%))",
  "hsl(var(--chart-2, 42 78% 52%))",
  "hsl(var(--chart-3, 8 65% 50%))",
  "hsl(var(--chart-4, 200 45% 40%))",
  "hsl(var(--chart-5, 265 35% 50%))",
];

const PRIMARY = "var(--color-primary, #2b6b4f)";
const ACCENT = "var(--color-accent, #d3a13a)";
const DANGER = "var(--color-destructive, #c0453b)";

const PALETTE = [PRIMARY, ACCENT, DANGER, "#3c7ea3", "#8367a8", "#a8825f"];

export function ChartCard({
  title,
  hint,
  actions,
  children,
  height = 240,
}: {
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  height?: number;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-1">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {actions}
      </CardHeader>
      <CardContent dir="ltr" className="pb-4 pt-2">
        <div className="w-full" style={{ height }}>
          {children}
        </div>
      </CardContent>

    </Card>
  );
}

const AXIS_COLOR = "#6b7280";

const axisProps = {
  tick: { fontSize: 11, fill: AXIS_COLOR },
  stroke: AXIS_COLOR,
  strokeOpacity: 0.35,
  tickLine: false,
} as const;

const tooltipProps = {
  contentStyle: {
    direction: "rtl" as const,
    fontSize: 12,
    borderRadius: 10,
    border: "1px solid var(--color-border, #e5e7eb)",
    background: "var(--color-card, #fff)",
    color: "var(--color-foreground, #111)",
  },
  formatter: (value: number | string) => money(Number(value)),
};

const compact = (v: number) => (Math.abs(v) >= 1000 ? `${int(v / 1000)}k` : int(v));

/** رسم مساحات: مقبوضات / مدفوعات أو مبيعات / محصّل */
export function FlowAreaChart({
  data,
  series,
}: {
  data: SeriesPoint[];
  series: Array<{ key: string; name: string; color?: string }>;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={s.color ?? PALETTE[i % PALETTE.length]} stopOpacity={0.35} />
            <stop offset="95%" stopColor={s.color ?? PALETTE[i % PALETTE.length]} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
      <XAxis dataKey="label" {...axisProps} />
      <YAxis {...axisProps} tickFormatter={compact} width={44} />
      <Tooltip {...tooltipProps} />
      <Legend wrapperStyle={{ fontSize: 12, direction: "rtl" }} />
      {series.map((s, i) => (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.name}
          stroke={s.color ?? PALETTE[i % PALETTE.length]}
          strokeWidth={2}
          fill={`url(#grad-${s.key})`}
        />
      ))}
    </AreaChart>
    </ResponsiveContainer>
  );
}

export function GroupedBarChart({
  data,
  series,
  vertical = false,
}: {
  data: SeriesPoint[];
  series: Array<{ key: string; name: string; color?: string }>;
  vertical?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
    <BarChart
      data={data}
      layout={vertical ? "vertical" : "horizontal"}
      margin={{ top: 4, right: 12, left: vertical ? 8 : 0, bottom: 0 }}
    >
      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={vertical} horizontal={!vertical} />
      {vertical ? (
        <XAxis type="number" {...axisProps} tickFormatter={compact} />
      ) : (
        <XAxis dataKey="label" {...axisProps} interval={0} />
      )}
      {vertical ? (
        <YAxis type="category" dataKey="label" {...axisProps} width={110} />
      ) : (
        <YAxis {...axisProps} tickFormatter={compact} width={44} />
      )}
      <Tooltip {...tooltipProps} cursor={{ fillOpacity: 0.06 }} />
      {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12, direction: "rtl" }} /> : null}
      {series.map((s, i) => (
        <Bar
          key={s.key}
          dataKey={s.key}
          name={s.name}
          radius={vertical ? [0, 6, 6, 0] : [6, 6, 0, 0]}
          fill={s.color ?? PALETTE[i % PALETTE.length]}
          maxBarSize={vertical ? 18 : 34}
        />
      ))}
    </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data, dataKey, name }: { data: SeriesPoint[]; dataKey: string; name: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
      <XAxis dataKey="label" {...axisProps} />
      <YAxis {...axisProps} tickFormatter={compact} width={44} />
      <Tooltip {...tooltipProps} />
      <Line
        type="monotone"
        dataKey={dataKey}
        name={name}
        stroke={PRIMARY}
        strokeWidth={2.5}
        dot={{ r: 3, fill: PRIMARY }}
        activeDot={{ r: 5 }}
      />
    </LineChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Tooltip {...tooltipProps} />
      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, direction: "rtl" }} />
      <Pie
        data={data}
        dataKey="value"
        nameKey="label"
        cx="50%"
        cy="45%"
        innerRadius={52}
        outerRadius={82}
        paddingAngle={2}
        stroke="none"
      >
        {data.map((_, i) => (
          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
        ))}
      </Pie>
    </PieChart>
    </ResponsiveContainer>
  );
}
