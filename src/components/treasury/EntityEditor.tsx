import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FieldDef<T> = {
  key: keyof T & string;
  label: string;
  type?: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
};

interface Props<T extends { id: string }> {
  title: string;
  description?: string;
  rows: T[];
  fields: FieldDef<T>[];
  /** نص العرض لكل صف */
  primary: (row: T) => string;
  secondary?: (row: T) => string;
  emptyRow: () => T;
  onSave: (row: T, isNew: boolean) => void;
  onDelete?: (row: T) => string | void;
}

/** محرر عام لبيانات النظام: إضافة / تعديل / حذف */
export function EntityEditor<T extends { id: string }>({
  title,
  description,
  rows,
  fields,
  primary,
  secondary,
  emptyRow,
  onSave,
  onDelete,
}: Props<T>) {
  const [draft, setDraft] = useState<T | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNew = () => {
    setDraft(emptyRow());
    setIsNew(true);
  };
  const openEdit = (row: T) => {
    setDraft({ ...row });
    setIsNew(false);
  };

  const submit = () => {
    if (!draft) return;
    for (const field of fields) {
      if (field.required && !String(draft[field.key] ?? "").trim()) {
        toast.error(`${field.label} مطلوب`);
        return;
      }
    }
    onSave(draft, isNew);
    setDraft(null);
    toast.success(isNew ? "تمت الإضافة" : "تم التعديل");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={openNew}>
          <Plus className="size-4" />
          إضافة
        </Button>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">لا توجد بيانات</p>
        ) : null}
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{primary(row)}</div>
              {secondary ? (
                <div className="truncate text-xs text-muted-foreground">{secondary(row)}</div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="icon" variant="ghost" onClick={() => openEdit(row)} aria-label="تعديل">
                <Pencil className="size-4" />
              </Button>
              {onDelete ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="حذف"
                  onClick={() => {
                    const error = onDelete(row);
                    if (error) toast.error(error);
                    else toast.success("تم الحذف");
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {isNew ? `إضافة إلى ${title}` : `تعديل — ${title}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {draft
              ? fields.map((field) => {
                  const value = draft[field.key];
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs">{field.label}</Label>
                      {field.type === "select" ? (
                        <Select
                          value={String(value ?? "")}
                          onValueChange={(next) =>
                            setDraft({ ...draft, [field.key]: next } as T)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر" />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options ?? []).map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type === "number" ? "number" : "text"}
                          value={String(value ?? "")}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              [field.key]:
                                field.type === "number"
                                  ? Number(event.target.value || 0)
                                  : event.target.value,
                            } as T)
                          }
                        />
                      )}
                    </div>
                  );
                })
              : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={submit}>حفظ</Button>
            <Button variant="outline" onClick={() => setDraft(null)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
