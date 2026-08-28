import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { accountingNav } from "@/lib/accountingNav";
import { supabase } from "@/integrations/supabase/externalClient";

export const Route = createFileRoute("/accounting/")({
  head: () => ({
    meta: [
      { title: "برنامج إعمار المحاسبي | تجارة الأعلاف" },
      {
        name: "description",
        content:
          "نظام محاسبي كامل لشركات تجارة الأعلاف في مصر: المخازن بالأوزان، المشتريات، المبيعات، الخزينة، القيود والتقارير المالية.",
      },
      { property: "og:title", content: "برنامج إعمار المحاسبي | تجارة الأعلاف" },
      {
        property: "og:description",
        content: "لوحة متابعة المبيعات والمخزون والمشتريات لشركات تجارة الأعلاف — تعمل بدون إنترنت.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountingHome,
});

const money = (n: any) =>
  Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function useTable(name: string) {
  return useQuery<any[]>({
    queryKey: [name],
    queryFn: async () => (await (supabase as any).from(name).select("*")).data ?? [],
  });
}

function AccountingHome() {
  const { data: invoices = [] } = useTable("acc_sales_invoices");
  const { data: items = [] } = useTable("acc_items");
  const { data: moves = [] } = useTable("acc_stock_moves");
  const { data: orders = [] } = useTable("acc_purchase_orders");

  const qtyOf = (itemId: string) =>
    moves
      .filter((m) => m.item_id === itemId)
      .reduce((t, m) => t + Number(m.quantity_kg || 0) * (m.move_type === "out" ? -1 : 1), 0);

  const sales = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const receivables = invoices.reduce((s, i) => s + Number(i.balance || 0), 0);
  const stockValue = items.reduce((s, it) => s + qtyOf(it.id) * Number(it.cost_price || 0), 0);
  const tons =
    moves.reduce((s, m) => s + Number(m.quantity_kg || 0) * (m.move_type === "out" ? -1 : 1), 0) / 1000;
  const lowItems = items.filter((it) => qtyOf(it.id) <= Number(it.reorder_level_kg || 0));
  const openPOs = orders.filter((o) => o.status === "draft" || o.status === "approved");

  const kpis = [
    { label: "إجمالي المبيعات", value: `${money(sales)} ج.م` },
    { label: "مديونية العملاء", value: `${money(receivables)} ج.م` },
    { label: "قيمة المخزون", value: `${money(stockValue)} ج.م` },
    { label: "كمية المخزون", value: `${money(tons)} طن` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة متابعة تجارة الأعلاف</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          نظرة سريعة على المبيعات والمخزون والمشتريات — البرنامج يعمل بالكامل بدون إنترنت ويزامن تلقائياً عند رجوع الاتصال.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{k.label}</div>
              <div className="text-2xl font-bold text-primary">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">أصناف تحت حد إعادة الطلب</CardTitle>
            <Badge className="bg-amber-100 text-amber-700">{lowItems.length}</Badge>
          </CardHeader>
          <CardContent>
            {lowItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">كل الأصناف فوق حد الطلب.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {lowItems.slice(0, 8).map((it) => (
                  <li key={it.id} className="flex justify-between gap-3">
                    <span>{it.name_ar}</span>
                    <span className="text-muted-foreground">
                      المتاح {money(qtyOf(it.id))} / حد الطلب {money(it.reorder_level_kg)} كجم
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">أوامر شراء مفتوحة</CardTitle>
            <Badge className="bg-blue-100 text-blue-700">{openPOs.length}</Badge>
          </CardHeader>
          <CardContent>
            {openPOs.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد أوامر شراء مفتوحة.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {openPOs.slice(0, 8).map((o) => (
                  <li key={o.id} className="flex justify-between gap-3">
                    <span>
                      {o.po_no} — {o.vendor_name}
                    </span>
                    <span className="text-muted-foreground">{money(o.total)} ج.م</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accountingNav.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle className="text-base">{group.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
