import { useMemo, useState } from "react";
import { BookOpen, Scale } from "lucide-react";

import { usePeriod } from "@/components/analytics/PeriodFilter";
import { ReportShell, ReportTable, printTableHtml, type ReportColumn } from "@/components/reports/ReportShell";
import { StatCard } from "@/components/treasury/PageHeader";
import { dateFmt, money } from "@/lib/format";
import { buildJournal, inRange, SOURCE_LABEL, type JournalEntry } from "@/lib/ledger";
import { useDb } from "@/lib/mockDb";
import { printHtml } from "@/lib/printDoc";

interface FlatRow {
  key: string;
  date: string;
  no: string;
  source: string;
  description: string;
  account: string;
  party: string;
  debit: number;
  credit: number;
}

/** دفتر اليومية العامة: كل القيود المتولدة من مستندات البرنامج */
export function JournalReport() {
  const data = useDb();
  const [range, setRange] = usePeriod("period:journal", "quarter");
  const [q, setQ] = useState("");

  const entries = useMemo<JournalEntry[]>(
    () => buildJournal(data).filter((e) => inRange(e.date, range.from, range.to)),
    [data, range.from, range.to],
  );

  const rows = useMemo<FlatRow[]>(() => {
    const flat: FlatRow[] = [];
    for (const e of entries) {
      for (const [i, l] of e.lines.entries()) {
        flat.push({
          key: `${e.id}-${i}`,
          date: e.date,
          no: e.no,
          source: SOURCE_LABEL[e.source],
          description: e.description,
          account: `${l.code} — ${l.name}`,
          party: l.party ?? "",
          debit: l.debit,
          credit: l.credit,
        });
      }
    }
    const term = q.trim().toLowerCase();
    if (!term) return flat;
    return flat.filter((r) =>
      [r.no, r.description, r.account, r.party, r.source].join(" ").toLowerCase().includes(term),
    );
  }, [entries, q]);

  const debit = rows.reduce((s, r) => s + r.debit, 0);
  const credit = rows.reduce((s, r) => s + r.credit, 0);

  const columns: ReportColumn<FlatRow>[] = [
    { key: "date", label: "التاريخ", cell: (r) => dateFmt(r.date), text: (r) => dateFmt(r.date) },
    { key: "no", label: "رقم المستند", cell: (r) => r.no, text: (r) => r.no },
    { key: "source", label: "النوع", cell: (r) => r.source, text: (r) => r.source },
    { key: "account", label: "الحساب", cell: (r) => r.account, text: (r) => r.account },
    { key: "party", label: "الطرف", cell: (r) => r.party || "—", text: (r) => r.party || "-" },
    { key: "desc", label: "البيان", cell: (r) => r.description, text: (r) => r.description },
    { key: "debit", label: "مدين", numeric: true, cell: (r) => (r.debit ? money(r.debit) : "—"), text: (r) => (r.debit ? money(r.debit) : "-") },
    { key: "credit", label: "دائن", numeric: true, cell: (r) => (r.credit ? money(r.credit) : "—"), text: (r) => (r.credit ? money(r.credit) : "-") },
  ];

  const print = () =>
    printHtml(
      "دفتر اليومية العامة",
      `<h1>دفتر اليومية العامة</h1>
       <table class="kv"><tbody><tr><td>الفترة</td><td>${dateFmt(range.from)} — ${dateFmt(range.to)}</td>
       <td>عدد القيود</td><td>${entries.length}</td><td>إجمالى مدين = دائن</td><td>${money(debit)}</td></tr></tbody></table>
       ${printTableHtml(columns, rows, ["الإجمالى", "", "", "", "", "", money(debit), money(credit)])}
       <div class="sig"><div>المحاسب</div><div>المدير المالى</div><div>الإدارة</div></div>`,
    );

  return (
    <ReportShell
      title="دفتر اليومية العامة"
      description="كل القيود المحاسبية المزدوجة المتولدة تلقائياً من الفواتير والسندات والمصروفات والتسويات"
      range={range}
      onRangeChange={setRange}
      onPrint={print}
      search={q}
      onSearchChange={setQ}
      searchPlaceholder="بحث برقم المستند أو الحساب..."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="عدد القيود" value={String(entries.length)} icon={<BookOpen className="size-4" />} />
        <StatCard label="إجمالى المدين" value={money(debit)} tone="muted" />
        <StatCard label="إجمالى الدائن" value={money(credit)} tone="muted" />
        <StatCard
          label="توازن القيود"
          value={Math.abs(debit - credit) < 0.5 ? "متوازن" : money(debit - credit)}
          tone={Math.abs(debit - credit) < 0.5 ? "primary" : "danger"}
          icon={<Scale className="size-4" />}
        />
      </div>

      <ReportTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.key}
        footer={["الإجمالى", "", "", "", "", "", money(debit), money(credit)]}
      />
    </ReportShell>
  );
}
