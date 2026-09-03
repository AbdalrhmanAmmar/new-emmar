import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";

import { usePeriod } from "@/components/analytics/PeriodFilter";
import { ReportShell, ReportTable, printTableHtml, type ReportColumn } from "@/components/reports/ReportShell";
import { StatCard } from "@/components/treasury/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dateFmt, money } from "@/lib/format";
import {
  ACCOUNTS,
  accountLedger,
  buildJournal,
  SOURCE_LABEL,
  type AccountKey,
  type LedgerLine,
} from "@/lib/ledger";
import { useDb } from "@/lib/mockDb";
import { printHtml } from "@/lib/printDoc";

const KEYS = Object.keys(ACCOUNTS) as AccountKey[];

/** دفتر الأستاذ العام: حركة حساب مختار مع رصيد متجدد */
export function GeneralLedgerReport() {
  const data = useDb();
  const [range, setRange] = usePeriod("period:ledger", "quarter");
  const [account, setAccount] = useState<AccountKey>("cash");
  const [q, setQ] = useState("");

  const entries = useMemo(() => buildJournal(data), [data]);
  const ledger = useMemo(
    () => accountLedger(entries, account, range.from, range.to),
    [entries, account, range.from, range.to],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ledger.lines;
    return ledger.lines.filter((l) =>
      [l.no, l.description, l.party, SOURCE_LABEL[l.source]].join(" ").toLowerCase().includes(term),
    );
  }, [ledger.lines, q]);

  const columns: ReportColumn<LedgerLine>[] = [
    { key: "date", label: "التاريخ", cell: (r) => dateFmt(r.date), text: (r) => dateFmt(r.date) },
    { key: "no", label: "المستند", cell: (r) => r.no, text: (r) => r.no },
    { key: "src", label: "النوع", cell: (r) => SOURCE_LABEL[r.source], text: (r) => SOURCE_LABEL[r.source] },
    { key: "party", label: "الطرف", cell: (r) => r.party || "—", text: (r) => r.party || "-" },
    { key: "desc", label: "البيان", cell: (r) => r.description, text: (r) => r.description },
    { key: "debit", label: "مدين", numeric: true, cell: (r) => (r.debit ? money(r.debit) : "—"), text: (r) => (r.debit ? money(r.debit) : "-") },
    { key: "credit", label: "دائن", numeric: true, cell: (r) => (r.credit ? money(r.credit) : "—"), text: (r) => (r.credit ? money(r.credit) : "-") },
    { key: "bal", label: "الرصيد", numeric: true, cell: (r) => money(r.balance), text: (r) => money(r.balance) },
  ];

  const totals = ["الإجمالى", "", "", "", "", money(ledger.debit), money(ledger.credit), money(ledger.closing)];

  const print = () =>
    printHtml(
      `دفتر الأستاذ — ${ACCOUNTS[account].name}`,
      `<h1>دفتر الأستاذ العام — ${ACCOUNTS[account].code} ${ACCOUNTS[account].name}</h1>
       <table class="kv"><tbody><tr><td>الفترة</td><td>${dateFmt(range.from)} — ${dateFmt(range.to)}</td>
       <td>رصيد ما قبل الفترة</td><td>${money(ledger.opening)}</td>
       <td>الرصيد الختامى</td><td>${money(ledger.closing)}</td></tr></tbody></table>
       ${printTableHtml(columns, rows, totals)}
       <div class="sig"><div>المحاسب</div><div>المدير المالى</div><div>الإدارة</div></div>`,
    );

  return (
    <ReportShell
      title="دفتر الأستاذ العام"
      description="حركة أى حساب بالتفصيل مع رصيد ما قبل الفترة والرصيد المتجدد والرصيد الختامى"
      range={range}
      onRangeChange={setRange}
      onPrint={print}
      search={q}
      onSearchChange={setQ}
      searchPlaceholder="بحث فى الحركات..."
      actions={
        <Select value={account} onValueChange={(v) => setAccount(v as AccountKey)}>
          <SelectTrigger className="h-9 w-64">
            <SelectValue placeholder="اختر الحساب" />
          </SelectTrigger>
          <SelectContent>
            {KEYS.map((k) => (
              <SelectItem key={k} value={k}>
                {ACCOUNTS[k].code} — {ACCOUNTS[k].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="رصيد ما قبل الفترة" value={money(ledger.opening)} tone="muted" icon={<BookOpen className="size-4" />} />
        <StatCard label="إجمالى المدين" value={money(ledger.debit)} tone="muted" />
        <StatCard label="إجمالى الدائن" value={money(ledger.credit)} tone="muted" />
        <StatCard label="الرصيد الختامى" value={money(ledger.closing)} tone={ledger.closing >= 0 ? "primary" : "danger"} />
      </div>

      <ReportTable columns={columns} rows={rows} rowKey={(r, i) => `${r.no}-${i}`} footer={totals} />
    </ReportShell>
  );
}
