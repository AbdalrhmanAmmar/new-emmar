import { useMemo } from "react";
import { Scale } from "lucide-react";

import { usePeriod } from "@/components/analytics/PeriodFilter";
import { ReportShell, ReportTable, printTableHtml, type ReportColumn } from "@/components/reports/ReportShell";
import { StatCard } from "@/components/treasury/PageHeader";
import { dateFmt, money } from "@/lib/format";
import { buildJournal, trialBalance, type TrialRow } from "@/lib/ledger";
import { useDb } from "@/lib/mockDb";
import { printHtml } from "@/lib/printDoc";

const TYPE_LABEL: Record<TrialRow["type"], string> = {
  asset: "أصول",
  liability: "خصوم",
  equity: "حقوق ملكية",
  revenue: "إيرادات",
  expense: "مصروفات",
};

/** ميزان المراجعة: أرصدة افتتاحية + حركة الفترة + الأرصدة الختامية */
export function TrialBalanceReport() {
  const data = useDb();
  const [range, setRange] = usePeriod("period:trial", "year");
  const rows = useMemo(
    () => trialBalance(buildJournal(data), range.from, range.to),
    [data, range.from, range.to],
  );

  const sum = (k: keyof TrialRow) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
  const debit = sum("debit");
  const credit = sum("credit");
  const balDebit = sum("balanceDebit");
  const balCredit = sum("balanceCredit");

  const columns: ReportColumn<TrialRow>[] = [
    { key: "code", label: "كود الحساب", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", label: "اسم الحساب", cell: (r) => r.name, text: (r) => r.name },
    { key: "type", label: "التصنيف", cell: (r) => TYPE_LABEL[r.type], text: (r) => TYPE_LABEL[r.type] },
    { key: "od", label: "رصيد افتتاحى مدين", numeric: true, cell: (r) => money(r.openingDebit), text: (r) => money(r.openingDebit) },
    { key: "oc", label: "رصيد افتتاحى دائن", numeric: true, cell: (r) => money(r.openingCredit), text: (r) => money(r.openingCredit) },
    { key: "d", label: "حركة مدين", numeric: true, cell: (r) => money(r.debit), text: (r) => money(r.debit) },
    { key: "c", label: "حركة دائن", numeric: true, cell: (r) => money(r.credit), text: (r) => money(r.credit) },
    { key: "bd", label: "رصيد ختامى مدين", numeric: true, cell: (r) => money(r.balanceDebit), text: (r) => money(r.balanceDebit) },
    { key: "bc", label: "رصيد ختامى دائن", numeric: true, cell: (r) => money(r.balanceCredit), text: (r) => money(r.balanceCredit) },
  ];

  const totals = [
    "الإجمالى",
    "",
    "",
    money(sum("openingDebit")),
    money(sum("openingCredit")),
    money(debit),
    money(credit),
    money(balDebit),
    money(balCredit),
  ];

  const print = () =>
    printHtml(
      "ميزان المراجعة",
      `<h1>ميزان المراجعة</h1>
       <table class="kv"><tbody><tr><td>الفترة</td><td>${dateFmt(range.from)} — ${dateFmt(range.to)}</td>
       <td>عدد الحسابات</td><td>${rows.length}</td><td>حالة الميزان</td><td>${
         Math.abs(balDebit - balCredit) < 0.5 ? "متوازن" : `فرق ${money(balDebit - balCredit)}`
       }</td></tr></tbody></table>
       ${printTableHtml(columns, rows, totals)}
       <div class="sig"><div>المحاسب</div><div>المدير المالى</div><div>الإدارة</div></div>`,
    );

  return (
    <ReportShell
      title="ميزان المراجعة"
      description="أرصدة كل الحسابات: افتتاحى وحركة الفترة والرصيد الختامى مدين/دائن"
      range={range}
      onRangeChange={setRange}
      onPrint={print}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="عدد الحسابات" value={String(rows.length)} />
        <StatCard label="إجمالى الحركة المدينة" value={money(debit)} tone="muted" />
        <StatCard label="إجمالى الحركة الدائنة" value={money(credit)} tone="muted" />
        <StatCard
          label="حالة الميزان"
          value={Math.abs(balDebit - balCredit) < 0.5 ? "متوازن" : money(balDebit - balCredit)}
          tone={Math.abs(balDebit - balCredit) < 0.5 ? "primary" : "danger"}
          icon={<Scale className="size-4" />}
        />
      </div>

      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.code} footer={totals} />
    </ReportShell>
  );
}
