import type { ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

import type { SeriesPoint } from "@/lib/analytics";

const tones = {
  primary: { box: "border-primary/25 bg-primary/5", stroke: "var(--color-primary, #2b6b4f)" },
  accent: { box: "border-accent/35 bg-accent/10", stroke: "var(--color-accent, #d3a13a)" },
  danger: { box: "border-destructive/30 bg-destructive/5", stroke: "var(--color-destructive, #c0453b)" },
  muted: { box: "border-border bg-muted/40", stroke: "var(--color-muted-foreground, #6b7280)" },
} as const;

/** كارت مؤشر: قيمة + نسبة تغير + رسم مصغّر */
export function KpiCard({
  label,
  value,
  hint,
  tone = "primary",
  icon,
  delta,
  spark,
  sparkKey = "value",
  deltaGoodWhenUp = true,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof tones;
  icon?: ReactNode;
  delta?: number;
  spark?: SeriesPoint[];
  sparkKey?: string;
  deltaGoodWhenUp?: boolean;
}) {
  const t = tones[tone];
  const up = (delta ?? 0) >= 0;
  const good = up === deltaGoodWhenUp;

  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 ${t.box}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <span className="text-lg font-bold text-foreground">{value}</span>
        {delta !== undefined && Number.isFinite(delta) ? (
          <span
            className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              good ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            }`}
            dir="ltr"
          >
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      {spark && spark.length > 1 ? (
        <div dir="ltr" className="mt-2 h-10 opacity-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.stroke} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={t.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={sparkKey}
                stroke={t.stroke}
                strokeWidth={1.8}
                fill={`url(#spark-${label})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}
