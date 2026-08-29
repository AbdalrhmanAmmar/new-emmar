import * as React from "react";
import { money } from "@/lib/docFlow";

export type TotalItem = { label: string; value: number; primary?: boolean };

/** شريط الإجماليات الموحّد أسفل أسطر أي مستند. */
export const TotalsBar = ({ items }: { items: TotalItem[] }) => (
  <div className="flex gap-3 text-sm flex-wrap">
    {items.map((t) => (
      <div
        key={t.label}
        className={
          t.primary
            ? "p-3 rounded bg-primary/10 border border-primary/30"
            : "p-3 rounded bg-muted"
        }
      >
        <span className="text-muted-foreground">{t.label} </span>
        <b className={t.primary ? "text-primary" : undefined}>
          {money(t.value)}
          {t.primary ? " ج.م" : ""}
        </b>
      </div>
    ))}
  </div>
);

export default TotalsBar;
