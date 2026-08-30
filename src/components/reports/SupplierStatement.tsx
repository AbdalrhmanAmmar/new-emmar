import { Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Field } from "@/components/treasury/FormPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateFmt, money, num } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { printSupplierStatement } from "@/lib/printStatement";
import { supplierLedger } from "@/lib/supplierLedger";

/** تقرير كشف حساب مورد — كل عمليات الشراء والمدفوعات والرصيد المستحق للمورد */
export function SupplierStatementReport() {
  const data = useDb();
  const [supplierId, setSupplierId] = useState<string | null>(data.suppliers[0]?.id ?? null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const supplier = supplierId ? data.suppliers.find((s) => s.id === supplierId) : undefined;
  const ledger = useMemo(
    () => (supplierId ? supplierLedger(data, supplierId, from || undefined, to || undefined) : null),
    [data, supplierId, from, to],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="كشف حساب مورد"
        description="كل عمليات الشراء بالتفصيل وكل ما تم دفعه والرصيد الحالى المستحق للمورد — بالجنيه المصري"
        actions={
          supplier && ledger ? (
            <Button
              type="button"
              className="gap-1.5"
              onClick={() => printSupplierStatement(supplier, ledger, { from, to })}
            >
              <Printer className="size-4" />
              طباعة كشف الحساب
            </Button>
          ) : null
        }
      />

      <section className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <Field label="المورد">
          <SearchSelect
            options={data.suppliers.map((s) => ({ value: s.id, label: s.name, hint: `${s.code} — ${s.phone}` }))}
            value={supplierId}
            onChange={setSupplierId}
            placeholder="اختر المورد"
          />
        </Field>
        <Field label="من تاريخ">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="إلى تاريخ">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </section>

      {ledger ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="عدد فواتير الشراء" value={String(ledger.invoiceCount)} tone="muted" />
            <StatCard label="إجمالى المشتريات (دائن)" value={money(ledger.totalCredit)} tone="primary" />
            <StatCard label="إجمالى المدفوع (مدين)" value={money(ledger.totalDebit)} tone="accent" />
            <StatCard
              label="الرصيد المستحق للمورد"
              value={money(ledger.balance)}
              tone={ledger.balance > 0.01 ? "danger" : "muted"}
              hint={ledger.lastInvoiceDate ? `آخر فاتورة: ${dateFmt(ledger.lastInvoiceDate)}` : undefined}
            />
          </div>

          <div className="table-scroll overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  {["م", "التاريخ", "نوع الحركة", "المستند", "البيان", "مدين (مدفوع)", "دائن (شراء)", "الرصيد"].map(
                    (h) => (
                      <th key={h} className="px-3 py-2 text-center font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {ledger.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      لا توجد حركات لهذا المورد فى الفترة المحددة
                    </td>
                  </tr>
                ) : (
                  ledger.rows.map((row, i) => (
                    <tr key={`${row.kind}-${row.ref}-${i}`} className="border-t border-border/60">
                      <td className="px-3 py-2 text-center text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 text-center">{dateFmt(row.date)}</td>
                      <td className="px-3 py-2 text-center text-xs">
                        {row.kind === "invoice" ? "فاتورة شراء" : "سند صرف / دفعة"}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">{row.ref}</td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">{row.desc}</td>
                      <td className="px-3 py-2 text-center text-primary">{row.debit ? num(row.debit) : "—"}</td>
                      <td className="px-3 py-2 text-center">{row.credit ? num(row.credit) : "—"}</td>
                      <td className="px-3 py-2 text-center font-bold">{num(row.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-muted/40 text-sm font-bold">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right">
                    الإجماليات
                  </td>
                  <td className="px-3 py-2 text-center">{num(ledger.totalDebit)}</td>
                  <td className="px-3 py-2 text-center">{num(ledger.totalCredit)}</td>
                  <td className="px-3 py-2 text-center">{num(ledger.balance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
