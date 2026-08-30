import { Info } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { dateFmt, money, num } from "@/lib/format";
import { UNIT_LABEL, useDb } from "@/lib/mockDb";
import { supplierInvoices, supplierPriceHistory, supplierStats } from "@/lib/purchases";

/** أيقونة تعجب جانب المورد: كل فواتير الشراء السابقة وأسعار التوريد */
export function SupplierHistoryButton({ supplierId }: { supplierId: string | null }) {
  const data = useDb();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"invoices" | "prices">("invoices");

  const supplier = supplierId ? data.suppliers.find((s) => s.id === supplierId) : undefined;
  const invoices = useMemo(() => (supplierId ? supplierInvoices(data, supplierId) : []), [data, supplierId]);
  const prices = useMemo(() => (supplierId ? supplierPriceHistory(data, supplierId) : []), [data, supplierId]);
  const stats = useMemo(() => (supplierId ? supplierStats(data, supplierId) : null), [data, supplierId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!supplierId}
          title="سجل فواتير المورد وأسعار التوريد"
          aria-label="سجل فواتير المورد وأسعار التوريد"
          className="size-9 shrink-0 border-accent/50 text-accent-foreground hover:bg-accent/15"
        >
          <Info className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="text-right">
          <DialogTitle>سجل المورد: {supplier?.name ?? "—"}</DialogTitle>
          <DialogDescription>كل فواتير الشراء السابقة وأسعار التوريد — بالجنيه المصري</DialogDescription>
        </DialogHeader>

        {stats ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Mini label="عدد الفواتير" value={String(stats.count)} />
            <Mini label="إجمالى المشتريات" value={money(stats.purchases)} />
            <Mini label="إجمالى المسدد" value={money(stats.paid)} />
            <Mini label="المستحق للمورد" value={money(stats.debt)} tone={stats.debt > 0.01} />
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button type="button" size="sm" variant={tab === "invoices" ? "default" : "outline"} onClick={() => setTab("invoices")}>
            الفواتير السابقة
          </Button>
          <Button type="button" size="sm" variant={tab === "prices" ? "default" : "outline"} onClick={() => setTab("prices")}>
            أسعار التوريد
          </Button>
        </div>

        <div className="table-scroll overflow-x-auto rounded-xl border border-border">
          {tab === "invoices" ? (
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  {["رقم الفاتورة", "فاتورة المورد", "التاريخ", "الأصناف", "الإجمالي", "المسدد", "المتبقي", "الحالة"].map((h) => (
                    <th key={h} className="px-3 py-2 text-center font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                      لا توجد فواتير شراء سابقة لهذا المورد
                    </td>
                  </tr>
                ) : (
                  invoices.map(({ invoice, total, paid, remaining }) => (
                    <tr key={invoice.id} className="border-t border-border/60">
                      <td className="px-3 py-2 text-center font-semibold">{invoice.no}</td>
                      <td className="px-3 py-2 text-center text-xs">{invoice.supplierInvoiceNo || "—"}</td>
                      <td className="px-3 py-2 text-center">{dateFmt(invoice.date)}</td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                        {invoice.lines.map((l) => `${l.name} (${num(l.qty)} × ${num(l.price)})`).join(" — ")}
                      </td>
                      <td className="px-3 py-2 text-center">{num(total)}</td>
                      <td className="px-3 py-2 text-center">{num(paid)}</td>
                      <td className="px-3 py-2 text-center font-semibold">{num(remaining)}</td>
                      <td className="px-3 py-2 text-center">
                        <StatusBadge
                          label={invoice.status === "posted" ? "مُرحّلة" : invoice.status === "draft" ? "مسودة" : "ملغاة"}
                          tone={invoice.status === "posted" ? "green" : invoice.status === "draft" ? "gold" : "red"}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  {["الكود", "الصنف", "الوحدة", "آخر سعر", "أقل سعر", "أعلى سعر", "متوسط السعر", "الكمية", "آخر فاتورة"].map((h) => (
                    <th key={h} className="px-3 py-2 text-center font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                      لا توجد أسعار توريد سابقة لهذا المورد
                    </td>
                  </tr>
                ) : (
                  prices.map((row) => (
                    <tr key={row.productId} className="border-t border-border/60">
                      <td className="px-3 py-2 text-center text-xs text-muted-foreground">{row.code}</td>
                      <td className="px-3 py-2 text-right font-semibold">{row.name}</td>
                      <td className="px-3 py-2 text-center text-xs">{row.unitName || UNIT_LABEL[row.unit]}</td>
                      <td className="px-3 py-2 text-center font-semibold text-primary">{num(row.lastPrice)}</td>
                      <td className="px-3 py-2 text-center">{num(row.minPrice)}</td>
                      <td className="px-3 py-2 text-center">{num(row.maxPrice)}</td>
                      <td className="px-3 py-2 text-center">{num(row.avgPrice)}</td>
                      <td className="px-3 py-2 text-center">{num(row.qty)}</td>
                      <td className="px-3 py-2 text-center text-xs">
                        {row.lastInvoiceNo} — {dateFmt(row.lastDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${tone ? "text-destructive" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
