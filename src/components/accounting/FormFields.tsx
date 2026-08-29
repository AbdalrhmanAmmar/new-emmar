import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

/** شبكة حقول متجاوبة. */
export const FieldGrid = ({ cols = 4, children }: { cols?: 2 | 3 | 4; children: React.ReactNode }) => (
  <div className={`grid gap-3 ${cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
    {children}
  </div>
);

export const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <Label>{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

export const TextField = ({
  label,
  hint,
  value,
  onChange,
  ...rest
}: { label: string; hint?: string; value: any; onChange: (v: string) => void } & Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange"
>) => (
  <Field label={label} hint={hint}>
    <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />
  </Field>
);

export const NumberField = ({
  label,
  hint,
  value,
  onChange,
  ...rest
}: { label: string; hint?: string; value: any; onChange: (v: number) => void } & Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
>) => (
  <Field label={label} hint={hint}>
    <Input type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} {...rest} />
  </Field>
);

export const DateField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <Field label={label}>
    <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
  </Field>
);

export type Option = { value: string; label: string };

export const SelectField = ({
  label,
  hint,
  value,
  onChange,
  options,
  placeholder = "اختر",
}: {
  label?: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
}) => {
  const control = (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  return label ? (
    <Field label={label} hint={hint}>
      {control}
    </Field>
  ) : (
    control
  );
};

/** مفتاح تشغيل/إيقاف بعنوان ووصف داخل إطار — يستخدم في صفحات الإعدادات. */
export const SwitchRow = ({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between rounded border p-3">
    <div>
      <div className="font-medium">{title}</div>
      {description && <div className="text-xs text-muted-foreground">{description}</div>}
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);
