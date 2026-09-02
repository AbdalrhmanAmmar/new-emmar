import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateTimeFmt, money } from "@/lib/format";
import { useDb, type Shift } from "@/lib/mockDb";

export const Route = createFileRoute("/treasury/reports/shift-closing")({
  head: () => ({
    meta: [
      { title: "تقرير تقفيل الورديات — تقارير الخزينة" },
      {
        name: "description",
        content: "موقف تقفيل الورديات بالفترة أو الموظف أو الخزينة: المفتوح والمقفل والفروقات.",
      },
      { property: "og:title", content: "تقرير تقفيل الورديات" },
      { property: "og:description", content: "متابعة حالة تقفيل ورديات الخزينة بالجنيه المصري." },
    ],
  }),
  component: ShiftClosingReport,
});

type StateFilter = "all" | "open" | "closed";

function ShiftClosingReport() {
  const data = useDb();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [safeId, setSafeId] = useState("");
  const [userId, setUserId] = useState("");
  const [state, setState] = useState<StateFilter>("all");

  const safeName = (id: string) => data.safes.find((s) => s.id === id)?.name ?? "-";
  const userName = (id: string) => data.users.find((u) => u.id === id)?.name ?? "-";

  const rows = useMemo(() => {
    return data.shifts
      .filter((s) => {
        const day = (s.openedAt ?? "").slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        if (safeId && s.safeId !== safeId) return false;
        if (userId && s.userId !== userId) return false;
        if (state !== "all" && s.status !== state) return false;
        return true;
      })
      .sort((a, b) => (b.openedAt ?? "").localeCompare(a.openedAt ?? ""));
  }, [data.shifts, from, to, safeId, userId, state]);

  const totals = useMemo(() => {
    const closed = rows.filter((r) => r.status === "closed");
    return {
      open: rows.length - closed.length,
      closed: closed.length,
      counted: closed.reduce((acc, r) => acc + (r.countedBalance ?? 0), 0),
      surplus: closed.reduce((acc, r) => acc + Math.max(r.difference ?? 0, 0), 0),
      deficit: closed.reduce((acc, r) => acc + Math.abs(Math.min(r.difference ?? 0, 0)), 0),
    };
  }, [rows]);

  const columns: Array<Column<Shift>> = [
    { key: "no", header: "الوردية", cell: (row) => <strong>{row.no}</strong>, text: (row) => row.no },
    { key: "safe", header: "الخزينة", cell: (row) => safeName(row.safeId), text: (row) => safeName(row.safeId) },
    { key: "user", header: "الموظف", cell: (row) => userName(row.userId), text: (row) => userName(row.userId) },
    { key: "opened", header: "وقت الفتح", cell: (row) => dateTimeFmt(row.openedAt), text: (row) => row.openedAt },
    {
      key: "closed",
      header: "وقت التقفيل",
      cell: (row) => (row.closedAt ? dateTimeFmt(row.closedAt) : "—"),
      text: (row) => row.closedAt ?? "",
    },
    {
      key: "opening",
      header: "رصيد الافتتاح",
      cell: (row) => money(row.openingBalance),
      text: (row) => String(row.openingBalance),
    },
    {
      key: "system",
      header: "الرصيد الدفتري",
      cell: (row) => (row.systemBalance == null ? "—" : money(row.systemBalance)),
      text: (row) => String(row.systemBalance ?? ""),
    },
    {
      key: "counted",
      header: "النقدية الفعلية",
      cell: (row) => (row.countedBalance == null ? "—" : money(row.countedBalance)),
      text: (row) => String(row.countedBalance ?? ""),
    },
    {
      key: "diff",
      header: "الفرق",
      cell: (row) =>
        row.status === "open" ? (
          "—"
        ) : (
          <strong className={(row.difference ?? 0) === 0 ? "text-primary" : "text-destructive"}>
            {money(row.difference ?? 0)}
          </strong>
        ),
      text: (row) => String(row.difference ?? ""),
    },
    {
      key: "state",
      header: "موقف التقفيل",
      align: "center",
      cell: (row) => {
        if (row.status === "open") return <StatusBadge label="مفتوحة" tone="gold" />;
        const diff = row.difference ?? 0;
        return (
          <StatusBadge
            label={diff === 0 ? "مقفلة مطابقة" : diff > 0 ? "مقفلة بزيادة" : "مقفلة بعجز"}
            tone={diff === 0 ? "green" : diff > 0 ? "gold" : "red"}
          />
        );
      },
      text: (row) => (row.status === "open" ? "مفتوحة" : "مقفلة"),
    },
    { key: "reason", header: "سبب الفرق", cell: (row) => row.reason || "—", text: (row) => row.reason },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="تقرير تقفيل الورديات"
        description="موقف تقفيل الورديات حسب الفترة أو الموظف أو الخزينة"
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            {(
              [
                { key: "all", label: "الكل" },
                { key: "open", label: "مفتوحة" },
                { key: "closed", label: "مقفلة" },
              ] as Array<{ key: StateFilter; label: string }>
            ).map((opt) => (
              <Button
                key={opt.key}
                size="sm"
                variant={state === opt.key ? "default" : "ghost"}
                onClick={() => setState(opt.key)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">من تاريخ</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">الخزينة</Label>
          <SearchSelect
            options={[{ value: "", label: "كل الخزن" }, ...data.safes.map((s) => ({ value: s.id, label: s.name }))]}
            value={safeId}
            onChange={setSafeId}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">الموظف</Label>
          <SearchSelect
            options={[{ value: "", label: "كل الموظفين" }, ...data.users.map((u) => ({ value: u.id, label: u.name }))]}
            value={userId}
            onChange={setUserId}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="ورديات مفتوحة" value={String(totals.open)} tone="accent" />
        <StatCard label="ورديات مقفلة" value={String(totals.closed)} tone="muted" />
        <StatCard label="إجمالي النقدية المُسلّمة" value={money(totals.counted)} />
        <StatCard label="إجمالي الزيادات" value={money(totals.surplus)} tone="accent" />
        <StatCard label="إجمالي العجز" value={money(totals.deficit)} tone="danger" />
      </div>

      <DataTable title="موقف تقفيل الورديات" data={rows} columns={columns} rowId={(row) => row.id} />
    </div>
  );
}
