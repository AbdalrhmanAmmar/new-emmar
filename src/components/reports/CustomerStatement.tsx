import { Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Field } from "@/components/treasury/FormPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { customerLedger } from "@/lib/customerLedger";
import { dateFmt, money, num } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { printCustomerStatement } from "@/lib/printStatement";

/** تقرير كشف حساب عميل — كل المسحوبات والمسددات والرصيد الجارى، قابل للطباعة */
export function CustomerStatementReport() {
  const data = useDb();
  const [customerId, setCustomerId] = useState<string | null>(data.customers[0]?.id ?? null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const customer = customerId ? data.customers.find((c) => c.id === customerId) : undefined;
  const ledger = useMemo(
    () => (customerId ? customerLedger(data, customerId, from || undefined, to || undefined) : null),
    [data, customerId, from, to],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="كشف حساب عميل"
        description="كل ما سحبه العميل بالتفصيل وكل ما سدده والرصيد الحالى المستحق عليه — بالجنيه المصري"
        actions={
          customer && ledger ? (
            <Button
              type="button"
              className="gap-1.5"
              onClick={() => printCustomerStatement(customer, ledger, { from, to })}
            >
              <Printer className="size-4" />
              طباعة كشف الحساب
            </Button>
          ) : null
        }
      />

      <section className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <Field label="العميل">
          <SearchSelect
            options={data.customers.map((c) => ({ value: c.id, label: c.name, hint: `${c.code} — ${c.phone}` }))}
            value={customerId}
            onChange={setCustomerId}
            placeholder="اختر العميل"
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
            <StatCard label="عدد الفواتير" value={String(ledger.invoiceCount)} tone="muted" />
            <StatCard label="إجمالى المسحوبات (مدين)" value={money(ledger.totalDebit)} tone="primary" />
            <StatCard label="إجمالى المسدد (دائن)" value={money(ledger.totalCredit)} tone="accent" />
            <StatCard
              label="الرصيد الحالى المستحق"
              value={money(ledger.balance)}
              tone={ledger.balance > 0.01 ? "danger" : "muted"}
              hint={ledger.lastInvoiceDate ? `آخر فاتورة: ${dateFmt(ledger.lastInvoiceDate)}` : undefined}
            />
          </div>

          <div className="table-scroll overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  {["م", "التاريخ", "نوع الحركة", "المستند", "البيان", "مدين", "دائن", "الرصيد"].map((h) => (
                    <th key={h} className="px-3 py-2 text-center font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledger.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      لا توجد حركات لهذا العميل فى الفترة المحددة
                    </td>
                  </tr>
                ) : (
                  ledger.rows.map((row, i) => (
                    <tr key={`${row.kind}-${row.ref}-${i}`} className="border-t border-border/60">
                      <td className="px-3 py-2 text-center text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 text-center">{dateFmt(row.date)}</td>
                      <td className="px-3 py-2 text-center text-xs">
                        {row.kind === "invoice" ? "فاتورة بيع" : "سداد / تحصيل"}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">{row.ref}</td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">{row.desc}</td>
                      <td className="px-3 py-2 text-center">{row.debit ? num(row.debit) : "—"}</td>
                      <td className="px-3 py-2 text-center text-primary">{row.credit ? num(row.credit) : "—"}</td>
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
