import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/format";
import { resetDb, useDb } from "@/lib/mockDb";

export const Route = createFileRoute("/treasury/settings/")({
  head: () => ({
    meta: [
      { title: "الإعدادات المتقدمة — الخزينة" },
      { name: "description", content: "بيانات النظام الأساسية وإعادة تعيين بيانات الوضع الافتراضي." },
      { property: "og:title", content: "إعدادات وبيانات النظام" },
      { property: "og:description", content: "الفروع والمستخدمين وبنود الإيراد والمصروف وإعادة تعيين البيانات." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const data = useDb();

  return (
    <div className="space-y-4">
      <PageHeader title="الإعدادات المتقدمة" description="بيانات النظام الأساسية وإدارة بيانات الوضع الافتراضي" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="الفروع" value={String(data.branches.length)} />
        <StatCard label="المستخدمون" value={String(data.users.length)} tone="accent" />
        <StatCard label="الخزن والحسابات" value={String(data.safes.length)} tone="muted" />
        <StatCard label="عدد السندات" value={String(data.vouchers.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">الفروع والمستخدمون</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {data.branches.map((branch) => (
              <div key={branch.id} className="rounded-lg border border-border/70 px-3 py-2">
                <strong>{branch.name}</strong>
                <div className="mt-1 text-xs text-muted-foreground">
                  الخزن: {data.safes.filter((s) => s.branchId === branch.id).length} — الأرصدة الافتتاحية:{" "}
                  {money(
                    data.safes
                      .filter((s) => s.branchId === branch.id)
                      .reduce((acc, s) => acc + s.openingBalance, 0),
                  )}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {data.users.map((user) => (
                <span key={user.id} className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
                  {user.name} — {user.role}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">بنود الإيرادات والمصروفات</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1.5 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-primary">إيرادات</p>
              {data.categories
                .filter((c) => c.kind === "revenue")
                .map((c) => (
                  <div key={c.id} className="rounded-md bg-muted/40 px-2 py-1 text-xs">
                    {c.name}
                  </div>
                ))}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-destructive">مصروفات</p>
              {data.categories
                .filter((c) => c.kind === "expense")
                .map((c) => (
                  <div key={c.id} className="rounded-md bg-muted/40 px-2 py-1 text-xs">
                    {c.name}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-destructive">إعادة تعيين البيانات</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            حذف كل السندات والتحويلات والورديات المسجلة والعودة لبيانات الوضع الافتراضي. لا يمكن التراجع.
          </p>
          <Button
            variant="destructive"
            className="gap-1.5"
            onClick={() => {
              resetDb();
              toast.success("تم إعادة تعيين بيانات النظام");
            }}
          >
            <RotateCcw className="size-4" />
            إعادة تعيين البيانات
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
