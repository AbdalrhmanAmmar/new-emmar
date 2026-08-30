import { ArrowLeft, Save } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormPageProps {
  title: string;
  subtitle?: string;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  children: ReactNode;
  extraActions?: ReactNode;
}

/** صفحة فورم كاملة (صفحة فرعية) للإضافة أو التعديل */
export function FormPage({
  title,
  subtitle,
  onCancel,
  onSubmit,
  submitLabel = "حفظ",
  children,
  extraActions,
}: FormPageProps) {
  return (
    <div className="form-page-enter space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {extraActions}
          <Button type="button" variant="outline" onClick={onCancel} className="gap-1.5">
            <ArrowLeft className="size-4" />
            رجوع
          </Button>
          <Button type="button" onClick={onSubmit} className="gap-1.5">
            <Save className="size-4" />
            {submitLabel}
          </Button>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="space-y-6 p-5">{children}</CardContent>
      </Card>
    </div>
  );
}

export function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="border-b border-border pb-2 text-sm font-semibold text-primary">{title}</h2>
      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
