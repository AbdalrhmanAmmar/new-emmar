import { useMemo, useState } from "react";
import { Users, Wallet } from "lucide-react";

import { usePeriod } from "@/components/analytics/PeriodFilter";
import { ReportShell, ReportTable, printTableHtml, type ReportColumn } from "@/components/reports/ReportShell";
import { StatCard } from "@/components/treasury/PageHeader";
import { dateFmt, money } from "@/lib/format";
import { payables, receivables, type PartyBalanceRow } from "@/lib/ledger";
import { useDb } from "@/lib/mockDb";
import { printHtml } from "@/lib/printDoc";

/** أرصدة العملاء (مديونيات) أو أرصدة الموردين (التزامات) مع أعمار الأرصدة */
export function PartyBalancesReport({ kind }: { kind: "customer" | "supplier" }) {
  const data = useDb();
  const isCustomer = kind === "customer";
  const [range, setRange] = usePeriod(`period:balances-${kind}`, "year");
  const [q, setQ] = useState("");

  const all = useMemo(
    () => (isCustomer ? receivables(data, range.to) : payables(data, range.to)),
    [data, isCustomer, range.to],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((r) => [r.code, r.name, r.phone].join(" ").toLowerCase().includes(term));
  }, [all, q]);

  const sum = (k: keyof PartyBalanceRow) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);

  const columns: ReportColumn<PartyBalanceRow>[] = [
    { key: "code", label: "الكود", cell: (r) => r.code, text: (r) => r.code },
    { key: "name", label: isCustomer ? "العميل" : "المورد", cell: (r) => r.name, text: (r) => r.name },
    { key: "phone", label: "الهاتف", cell: (r) => r.phone || "—", text: (r) => r.phone || "-" },
    { key: "inv", label: "عدد الفواتير", numeric: true, cell: (r) => String(r.invoices), text: (r) => String(r.invoices) },
    { key: "total", label: "إجمالى الفواتير", numeric: true, cell: (r) => money(r.total), text: (r) => money(r.total) },
    { key: "paid", label: "المسدد بالفاتورة", numeric: true, cell: (r) => money(r.paid), text: (r) => money(r.paid) },
    { key: "vouchers", label: isCustomer ? "تحصيلات بسندات" : "مدفوعات بسندات", numeric: true, cell: (r) => money(r.vouchers), text: (r) => money(r.vouchers) },
    { key: "returns", label: "مرتجعات على الحساب", numeric: true, cell: (r) => money(r.returns), text: (r) => money(r.returns) },
    { key: "balance", label: isCustomer ? "المديونية الحالية" : "المستحق للمورد", numeric: true, cell: (r) => money(r.balance), text: (r) => money(r.balance) },
    { key: "b0", label: "حتى 30 يوم", numeric: true, cell: (r) => money(r.b0), text: (r) => money(r.b0) },
    { key: "b30", label: "31 — 60", numeric: true, cell: (r) => money(r.b30), text: (r) => money(r.b30) },
    { key: "b60", label: "61 — 90", numeric: true, cell: (r) => money(r.b60), text: (r) => money(r.b60) },
    { key: "b90", label: "أكثر من 90", numeric: true, cell: (r) => money(r.b90), text: (r) => money(r.b90) },
    { key: "last", label: "آخر تعامل", cell: (r) => (r.lastDate ? dateFmt(r.lastDate) : "—"), text: (r) => (r.lastDate ? dateFmt(r.lastDate) : "-") },
  ];

  const totals = [
    "الإجمالى",
    "",
    "",
    String(sum("invoices")),
    money(sum("total")),
    money(sum("paid")),
    money(sum("vouchers")),
    money(sum("returns")),
    money(sum("balance")),
    money(sum("b0")),
    money(sum("b30")),
    money(sum("b60")),
    money(sum("b90")),
    "",
  ];

  const title = isCustomer ? "أرصدة ومديونيات العملاء" : "أرصدة ومستحقات الموردين";

  const print = () =>
    printHtml(
      title,
      `<h1>${title}</h1>
       <table class="kv"><tbody><tr><td>حتى تاريخ</td><td>${dateFmt(range.to)}</td>
       <td>عدد الأطراف</td><td>${rows.length}</td>
       <td>إجمالى الرصيد</td><td>${money(sum("balance"))}</td></tr></tbody></table>
       ${printTableHtml(columns, rows, totals)}
       <div class="sig"><div>المحاسب</div><div>المدير المالى</div><div>الإدارة</div></div>`,
    );

  return (
    <ReportShell
      title={title}
      description={
        isCustomer
          ? "رصيد كل عميل: الفواتير والمسدد والتحصيلات والمرتجعات مع أعمار المديونية"
          : "رصيد كل مورد: الفواتير والمدفوعات والمرتجعات مع أعمار الالتزامات"
      }
      range={range}
      onRangeChange={setRange}
      onPrint={print}
      search={q}
      onSearchChange={setQ}
      searchPlaceholder={isCustomer ? "بحث باسم أو كود العميل..." : "بحث باسم أو كود المورد..."}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="عدد الأطراف" value={String(rows.length)} icon={<Users className="size-4" />} />
        <StatCard label="إجمالى الفواتير" value={money(sum("total"))} tone="muted" />
        <StatCard label={isCustomer ? "إجمالى المحصل" : "إجمالى المدفوع"} value={money(sum("paid") + sum("vouchers"))} tone="accent" />
        <StatCard
          label={isCustomer ? "إجمالى المديونية" : "إجمالى المستحق"}
          value={money(sum("balance"))}
          tone="danger"
          icon={<Wallet className="size-4" />}
        />
      </div>

      <ReportTable columns={columns} rows={rows} rowKey={(r) => r.id} footer={totals} />
    </ReportShell>
  );
}
