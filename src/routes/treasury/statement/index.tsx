import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard } from "@/components/treasury/PageHeader";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateFmt, money } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { safeBalance, safeMovements, type Movement } from "@/lib/treasury";

const DOC_TYPE_LABEL: Record<Movement["docType"], string> = {
  receipt: "سند قبض",
  payment: "سند صرف",
  "transfer-in": "تحويل وارد",
  "transfer-out": "تحويل صادر",
  "transfer-fee": "مصاريف تحويل",
};

export const Route = createFileRoute("/treasury/statement/")({
  validateSearch: (search: Record<string, unknown>) => ({
    safe: typeof search.safe === "string" ? search.safe : undefined,
  }),
  head: () => ({
    meta: [
      { title: "كشف حركة الخزينة — الخزينة" },
      { name: "description", content: "كشف تفصيلي لحركة أي خزينة أو حساب بنكي مع الرصيد التراكمي." },
      { property: "og:title", content: "كشف حركة الخزينة" },
      { property: "og:description", content: "المقبوضات والمدفوعات والتحويلات والرصيد المتحرك." },
    ],
  }),
  component: StatementPage,
});

interface Row extends Movement {
  running: number;
}

function StatementPage() {
  const data = useDb();
  const search = Route.useSearch();
  const [safeId, setSafeId] = useState(search.safe ?? data.safes[0]?.id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo<Row[]>(() => {
    const moves = safeMovements(data, safeId)
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.docNo.localeCompare(b.docNo)));
    const safe = data.safes.find((s) => s.id === safeId);
    let running = safe?.openingBalance ?? 0;
    const out: Row[] = [];
    for (const move of moves) {
      running += move.debit - move.credit;
      if (from && move.date < from) continue;
      if (to && move.date > to) continue;
      out.push({ ...move, running });
    }
    return out.reverse();
  }, [data, safeId, from, to]);

  const columns: Array<Column<Row>> = [
    { key: "date", header: "التاريخ", cell: (row) => dateFmt(row.date), text: (row) => dateFmt(row.date) },
    { key: "doc", header: "المستند", cell: (row) => <strong>{row.docNo}</strong>, text: (row) => row.docNo },
    { key: "type", header: "النوع", cell: (row) => DOC_TYPE_LABEL[row.docType], text: (row) => DOC_TYPE_LABEL[row.docType] },
    { key: "desc", header: "البيان", cell: (row) => row.description, text: (row) => row.description },
    {
      key: "user",
      header: "المستخدم",
      cell: (row) => data.users.find((u) => u.id === row.userId)?.name ?? "-",
      text: (row) => data.users.find((u) => u.id === row.userId)?.name ?? "",
    },
    { key: "debit", header: "وارد", cell: (row) => (row.debit ? <span className="text-primary">{money(row.debit)}</span> : "-"), text: (row) => String(row.debit) },
    { key: "credit", header: "صادر", cell: (row) => (row.credit ? <span className="text-destructive">{money(row.credit)}</span> : "-"), text: (row) => String(row.credit) },
    { key: "running", header: "الرصيد", cell: (row) => <strong>{money(row.running)}</strong>, text: (row) => String(row.running) },
  ];

  const totals = rows.reduce(
    (acc, row) => {
      acc.debit += row.debit;
      acc.credit += row.credit;
      return acc;
    },
    { debit: 0, credit: 0 },
  );

  return (
    <div className="space-y-4">
      <PageHeader title="كشف حركة الخزينة" description="حركة تفصيلية بالرصيد التراكمي لكل خزينة أو حساب" />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">الخزينة</Label>
          <SearchSelect
            options={data.safes.map((s) => ({ value: s.id, label: s.name, hint: s.code }))}
            value={safeId}
            onChange={setSafeId}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">من تاريخ</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="إجمالي الوارد" value={money(totals.debit)} />
        <StatCard label="إجمالي الصادر" value={money(totals.credit)} tone="danger" />
        <StatCard label="الرصيد الحالي" value={money(safeBalance(data, safeId))} tone="accent" />
      </div>

      <DataTable
        title={`كشف حركة — ${data.safes.find((s) => s.id === safeId)?.name ?? ""}`}
        data={rows}
        columns={columns}
        rowId={(row) => row.id}
      />
    </div>
  );
}
