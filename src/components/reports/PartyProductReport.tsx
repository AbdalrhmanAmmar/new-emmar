import { Printer, X } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, num } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { lineTotals } from "@/lib/sales";
import { lineUnitLabel } from "@/lib/units";

interface ReportRow {
  id: string;
  invoiceNo: string;
  date: string;
  partyName: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
}

export function PartyProductReport({ kind }: { kind: "sales" | "purchases" }) {
  const data = useDb();
  const isSales = kind === "sales";

  const [partyId, setPartyId] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const partyOptions = useMemo(
    () =>
      (isSales ? data.customers : data.suppliers).map((p) => ({
        value: p.id,
        label: p.name,
        hint: p.code,
      })),
    [data.customers, data.suppliers, isSales],
  );

  const productPick = useMemo(
    () =>
      data.products
        .filter((p) => !productIds.includes(p.id))
        .map((p) => ({ value: p.id, label: p.name, hint: p.code })),
    [data.products, productIds],
  );

  const rows = useMemo<ReportRow[]>(() => {
    const invoices = isSales
      ? data.salesInvoices.map((i) => ({
          id: i.id,
          no: i.no,
          date: i.date,
          status: i.status,
          partyId: i.customerId,
          partyName: i.customerName,
          lines: i.lines,
        }))
      : data.purchaseInvoices.map((i) => ({
          id: i.id,
          no: i.no,
          date: i.date,
          status: i.status,
          partyId: i.supplierId,
          partyName: i.supplierName,
          lines: i.lines,
        }));

    const out: ReportRow[] = [];
    for (const inv of invoices) {
      if (inv.status !== "posted") continue;
      if (partyId && inv.partyId !== partyId) continue;
      if (from && inv.date < from) continue;
      if (to && inv.date > to) continue;
      for (const line of inv.lines) {
        if (productIds.length > 0 && !productIds.includes(line.productId)) continue;
        const t = lineTotals(line);
        out.push({
          id: `${inv.id}_${line.id}`,
          invoiceNo: inv.no,
          date: inv.date,
          partyName: inv.partyName,
          code: line.code,
          name: line.name,
          unit: lineUnitLabel(line),
          qty: Number(line.qty || 0),
          price: Number(line.price || 0),
          discount: t.discount,
          tax: t.tax,
          total: t.total,
        });
      }
    }
    return out.sort((a, b) => (a.date === b.date ? a.invoiceNo.localeCompare(b.invoiceNo) : a.date.localeCompare(b.date)));
  }, [data.salesInvoices, data.purchaseInvoices, isSales, partyId, productIds, from, to]);

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalValue = rows.reduce((s, r) => s + r.total, 0);
  const avgPrice = totalQty > 0 ? rows.reduce((s, r) => s + r.qty * r.price, 0) / totalQty : 0;
  const invoicesCount = new Set(rows.map((r) => r.invoiceNo)).size;

  const columns: Array<Column<ReportRow>> = [
    { key: "date", header: "التاريخ", align: "center", cell: (r) => r.date, text: (r) => r.date },
    { key: "no", header: "رقم الفاتورة", cell: (r) => r.invoiceNo, text: (r) => r.invoiceNo },
    { key: "party", header: isSales ? "العميل" : "المورد", cell: (r) => r.partyName, text: (r) => r.partyName },
    { key: "code", header: "كود الصنف", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", header: "الصنف", cell: (r) => r.name, text: (r) => r.name },
    { key: "unit", header: "الوحدة", align: "center", cell: (r) => r.unit, text: (r) => r.unit },
    { key: "qty", header: "الكمية", cell: (r) => num(r.qty) },
    { key: "price", header: isSales ? "سعر البيع" : "سعر الشراء", cell: (r) => money(r.price) },
    { key: "discount", header: "الخصم", cell: (r) => money(r.discount) },
    { key: "tax", header: "الضريبة", cell: (r) => money(r.tax) },
    { key: "total", header: "الإجمالى", cell: (r) => money(r.total) },
  ];

  const partyLabel = partyOptions.find((p) => p.value === partyId)?.label ?? (isSales ? "كل العملاء" : "كل الموردين");

  return (
    <div className="space-y-4">
      <PageHeader
        title={isSales ? "تقرير أصناف العميل" : "تقرير أصناف المورد"}
        description={
          isSales
            ? "حركة صنف أو عدة أصناف مع عميل محدد: الكميات والأسعار والإجماليات خلال فترة"
            : "حركة صنف أو عدة أصناف مع مورد محدد: الكميات وأسعار الشراء والإجماليات خلال فترة"
        }
        actions={
          <Button variant="outline" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="size-4" />
            طباعة
          </Button>
        }
      />

      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>{isSales ? "العميل" : "المورد"}</Label>
            <SearchSelect
              options={[{ value: "", label: isSales ? "كل العملاء" : "كل الموردين" }, ...partyOptions]}
              value={partyId}
              onChange={(v) => setPartyId(v ?? "")}
              placeholder={isSales ? "كل العملاء" : "كل الموردين"}
            />
          </div>
          <div className="space-y-1.5">
            <Label>إضافة صنف</Label>
            <SearchSelect
              options={productPick}
              value=""
              onChange={(v) => v && setProductIds((ids) => [...ids, v])}
              placeholder="اختر صنف أو أكثر"
            />
          </div>
          <div className="space-y-1.5">
            <Label>من تاريخ</Label>
            <Input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>إلى تاريخ</Label>
            <Input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        {productIds.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {productIds.map((id) => {
              const p = data.products.find((x) => x.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium"
                >
                  {p?.name ?? id}
                  <button
                    type="button"
                    aria-label="حذف الصنف"
                    onClick={() => setProductIds((ids) => ids.filter((x) => x !== id))}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              );
            })}
            <Button variant="ghost" size="sm" onClick={() => setProductIds([])}>
              تفريغ الأصناف
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">لم تختر أصنافاً — التقرير يعرض كل الأصناف.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="عدد الفواتير" value={num(invoicesCount)} />
        <StatCard label="إجمالى الكمية" value={num(totalQty)} tone="accent" />
        <StatCard label="متوسط السعر" value={money(avgPrice)} />
        <StatCard label={isSales ? "إجمالى المبيعات" : "إجمالى المشتريات"} value={money(totalValue)} />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowId={(r) => r.id}
        title={`تفاصيل الأصناف — ${partyLabel}`}
        searchPlaceholder="ابحث برقم الفاتورة أو الصنف..."
        emptyText="لا توجد حركات مطابقة للفلاتر"
        footerNote={`إجمالى الكمية ${num(totalQty)} — إجمالى القيمة ${money(totalValue)}`}
      />
    </div>
  );
}
