import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "primary",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "accent" | "danger" | "muted";
  icon?: ReactNode;
}) {
  const tones: Record<string, string> = {
    primary: "border-primary/25 bg-primary/5 text-primary",
    accent: "border-accent/35 bg-accent/10 text-accent-foreground",
    danger: "border-destructive/30 bg-destructive/5 text-destructive",
    muted: "border-border bg-muted/40 text-foreground",
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-lg font-bold text-foreground">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function StatusBadge({ label, tone }: { label: string; tone: "green" | "gold" | "red" | "gray" }) {
  const tones = {
    green: "border-primary/30 bg-primary/10 text-primary",
    gold: "border-accent/40 bg-accent/15 text-amber-800",
    red: "border-destructive/30 bg-destructive/10 text-destructive",
    gray: "border-border bg-muted text-muted-foreground",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {label}
    </span>
  );
}
