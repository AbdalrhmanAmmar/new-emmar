import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";

/** بطاقة مؤشر (KPI) موحّدة للوحات المتابعة وأعلى الشاشات. */
export const StatCard = ({
  label,
  value,
  suffix,
  icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  icon?: React.ReactNode;
  tone?: "default" | "primary" | "success" | "danger";
}) => {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-emerald-600"
        : tone === "danger"
          ? "text-destructive"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-xl font-bold ${toneCls}`}>
            {value}
            {suffix && <span className="text-xs font-normal text-muted-foreground"> {suffix}</span>}
          </div>
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardContent>
    </Card>
  );
};

export default StatCard;
