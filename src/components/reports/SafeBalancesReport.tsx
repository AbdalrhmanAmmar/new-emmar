import { useMemo } from "react";
import { Wallet } from "lucide-react";

import { usePeriod } from "@/components/analytics/PeriodFilter";
import { ReportShell, ReportTable, printTableHtml, type ReportColumn } from "@/components/reports/ReportShell";
import { StatCard } from "@/components/treasury/PageHeader";
import { dateFmt, money } from "@/lib/format";
import { safeBalances, type SafeBalanceRow } from "@/lib/ledger";
import { SAFE_TYPE_LABEL, useDb, type SafeType } from "@/lib/mockDb";
import { printHtml } from "@/lib/printDoc";

/** أرصدة الخزائن والبنوك: رصيد افتتاحى + وارد − منصرف = الرصيد الحالى */
export function SafeBalancesReport() {
  const data = useDb();
  const [range, setRange] = usePeriod("period:safe-balances", "quarter");
  const rows = useMemo(() => safeBalances(data, range.from, range.to), [data, range.from, range.to]);

  const sum = (k: keyof SafeBalanceRow) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);

  const columns: ReportColumn<SafeBalanceRow>[] = [
    { key: "code", label: "الكود", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", label: "الخزنة / البنك", cell: (r) => r.name, text: (r) => r.name },
    {
      key: "type",
      label: "النوع",
      cell: (r) => SAFE_TYPE_LABEL[r.type as SafeType] ?? r.type,
      text: (r) => SAFE_TYPE_LABEL[r.type as SafeType] ?? r.type,
    },
    { key: "opening", label: "رصيد افتتاحى", numeric: true, cell: (r) => money(r.opening), text: (r) => money(r.opening) },
    { key: "in", label: "الوارد", numeric: true, cell: (r) => money(r.inflow), text: (r) => money(r.inflow) },
    { key: "out", label: "المنصرف", numeric: true, cell: (r) => money(r.outflow), text: (r) => money(r.outflow) },
    { key: "bal", label: "الرصيد الحالى", numeric: true, cell: (r) => money(r.balance), text: (r) => money(r.balance) },
  ];

  const totals = [
    "الإجمالى",
    "",
    "",
    money(sum("opening")),
    money(sum("inflow")),
    money(sum("outflow")),
    money(sum("balance")),
  ];

  const print = () =>
    printHtml(
      "أرصدة الخزائن والبنوك",
      `<h1>أرصدة الخزائن والبنوك</h1>
       <table class="kv"><tbody><tr><td>الفترة</td><td>${dateFmt(range.from)} — ${dateFmt(range.to)}</td>
       <td>عدد الخزائن</td><td>${rows.length}</td><td>إجمالى النقدية</td><td>${money(sum("balance"))}</td></tr></tbody></table>
       ${printTableHtml(columns, rows, totals)}
       <div class="sig"><div>أمين الخزينة</div><div>المحاسب</div><div>الإدارة</div></div>`,
    );

  return (
    <ReportShell
      title="أرصدة الخزائن والبنوك"
      description="رصيد كل خزنة أو حساب بنكى: افتتاحى والوارد والمنصرف والرصيد الحالى"
      range={range}
      onRangeChange={setRange}
      onPrint={print}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="عدد الخزائن" value={String(rows.length)} icon={<Wallet className="size-4" />} />
        <StatCard label="إجمالى الوارد" value={money(sum("inflow"))} tone="accent" />
        <StatCard label="إجمالى المنصرف" value={money(sum("outflow"))} tone="danger" />
        <StatCard label="إجمالى النقدية الحالية" value={money(sum("balance"))} />
      </div>

      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} footer={totals} />
    </ReportShell>
  );
}
