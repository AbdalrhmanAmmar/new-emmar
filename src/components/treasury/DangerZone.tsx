import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDb, wipeBusinessData } from "@/lib/mockDb";
import { useCurrentUser } from "@/lib/session";

const CONFIRM_WORD = "حذف";

/** منطقة الخطر: حذف كل بيانات البرنامج — لمدير النظام فقط */
export function DangerZone() {
  const current = useCurrentUser();
  const data = useDb();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [keepSettings, setKeepSettings] = useState(true);

  if (!current?.superAdmin) return null;

  const counts = [
    { label: "فواتير المبيعات", n: data.salesInvoices.length },
    { label: "فواتير المشتريات", n: data.purchaseInvoices.length },
    { label: "السندات المالية", n: data.vouchers.length },
    { label: "الأذون المخزنية", n: data.stockMoves.length },
    { label: "العملاء والموردون", n: data.customers.length + data.suppliers.length },
    { label: "الأصناف", n: data.products.length },
    { label: "الموظفون والمصروفات", n: data.employees.length + data.expenses.length },
  ];

  const confirm = () => {
    if (word.trim() !== CONFIRM_WORD) {
      toast.error(`اكتب كلمة «${CONFIRM_WORD}» للتأكيد`);
      return;
    }
    wipeBusinessData({ keepSettings });
    setWord("");
    setOpen(false);
    toast.success("تم حذف كافة البيانات — بيانات المستخدمين والصلاحيات محفوظة");
  };

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          منطقة الخطر — مدير النظام فقط
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          حذف كافة البيانات المسجلة فى البرنامج (فواتير، سندات، أذون، عملاء، موردون، أصناف، مخازن، موظفون،
          مصروفات) مع الاحتفاظ الكامل ببيانات <span className="font-semibold text-foreground">إدارة المستخدمين</span>{" "}
          (الحسابات والأدوار والصلاحيات). لا يمكن التراجع عن هذه العملية.
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {counts.map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-card px-2.5 py-2">
              <div className="text-[11px] text-muted-foreground">{c.label}</div>
              <div className="text-sm font-bold">{c.n}</div>
            </div>
          ))}
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <span>الاحتفاظ بالإعدادات الرئيسية وبيانات الشركة</span>
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={keepSettings}
            onChange={(e) => setKeepSettings(e.target.checked)}
          />
        </label>

        <Button variant="destructive" className="gap-1.5" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" />
          حذف كافة البيانات المسجلة
        </Button>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد حذف كافة البيانات</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف كل الحركات والبيانات الرئيسية نهائياً. بيانات المستخدمين والأدوار والصلاحيات لن تُحذف.
                اكتب كلمة «{CONFIRM_WORD}» للمتابعة.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <Label className="text-xs">كلمة التأكيد</Label>
              <Input dir="rtl" value={word} onChange={(e) => setWord(e.target.value)} placeholder={CONFIRM_WORD} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setWord("")}>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  confirm();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف نهائى
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
