import type { DbShape } from "@/lib/mockDb";
import { invoiceTotalsOf } from "@/lib/sales";
import { aging, cashFlow, safeBalance } from "@/lib/treasury";

/* ============================================================
 * تحليلات اللوحات: سلاسل زمنية ونسب ومؤشرات جاهزة للرسم
 * ============================================================ */

export interface SeriesPoint {
  label: string;
  [key: string]: string | number;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${m}/${String(y).slice(2)}`;
}

/** التدفق النقدي شهرياً (تصاعدي للرسم) */
export function cashFlowSeries(data: DbShape, months = 6): SeriesPoint[] {
  return cashFlow(data, "month")
    .slice(0, months)
    .reverse()
    .map((row) => ({
      label: monthLabel(row.key),
      inflow: Math.round(row.inflow),
      outflow: Math.round(row.outflow),
      net: Math.round(row.net),
    }));
}

/** التدفق النقدي اليومي (آخر N يوم بحركة) */
export function dailyFlowSeries(data: DbShape, days = 14): SeriesPoint[] {
  return cashFlow(data, "day")
    .slice(0, days)
    .reverse()
    .map((row) => ({
      label: row.key.slice(5).split("-").reverse().join("/"),
      inflow: Math.round(row.inflow),
      outflow: Math.round(row.outflow),
      net: Math.round(row.net),
    }));
}

/** توزيع الأرصدة على الخزن (للرسم الدائري) */
export function safeMixSeries(data: DbShape): SeriesPoint[] {
  return data.safes
    .filter((s) => s.active)
    .map((s) => ({ label: s.name, value: Math.max(0, Math.round(safeBalance(data, s.id))) }))
    .filter((r) => Number(r.value) > 0);
}

/** أعمار الديون مجمّعة (شرائح) */
export function agingBuckets(data: DbShape, kind: "sales" | "purchase"): SeriesPoint[] {
  const rows = aging(data, kind);
  const sum = (pick: (r: (typeof rows)[number]) => number) => Math.round(rows.reduce((a, r) => a + pick(r), 0));
  return [
    { label: "غير مستحق", value: sum((r) => r.b0) },
    { label: "1-30 يوم", value: sum((r) => r.b30) },
    { label: "31-60 يوم", value: sum((r) => r.b60) },
    { label: "أكثر من 60", value: sum((r) => r.b90) },
  ];
}

/* ===================== تحليلات المبيعات ===================== */

export interface SalesKpis {
  sales: number;
  paid: number;
  remaining: number;
  tax: number;
  count: number;
  avgTicket: number;
  cashShare: number;
  creditShare: number;
}

export function salesKpis(data: DbShape): SalesKpis {
  const posted = data.salesInvoices.filter((i) => i.status === "posted");
  let sales = 0;
  let paid = 0;
  let tax = 0;
  let creditTotal = 0;
  for (const inv of posted) {
    const t = invoiceTotalsOf(data, inv);
    sales += t.total;
    paid += t.paid;
    tax += t.tax;
    if (inv.payMethod === "credit") creditTotal += t.total;
  }
  return {
    sales,
    paid,
    remaining: Math.max(0, sales - paid),
    tax,
    count: posted.length,
    avgTicket: posted.length ? sales / posted.length : 0,
    cashShare: sales > 0 ? ((sales - creditTotal) / sales) * 100 : 0,
    creditShare: sales > 0 ? (creditTotal / sales) * 100 : 0,
  };
}

/** مبيعات يومية (تصاعدي) */
export function salesTrendSeries(data: DbShape, days = 14): SeriesPoint[] {
  const map = new Map<string, { total: number; paid: number; count: number }>();
  for (const inv of data.salesInvoices) {
    if (inv.status !== "posted") continue;
    const t = invoiceTotalsOf(data, inv);
    const row = map.get(inv.date) ?? { total: 0, paid: 0, count: 0 };
    row.total += t.total;
    row.paid += t.paid;
    row.count += 1;
    map.set(inv.date, row);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, days)
    .reverse()
    .map(([date, row]) => ({
      label: date.slice(5).split("-").reverse().join("/"),
      total: Math.round(row.total),
      paid: Math.round(row.paid),
      count: row.count,
    }));
}

/** توزيع طرق الدفع */
export function payMethodSeries(data: DbShape): SeriesPoint[] {
  const labels: Record<string, string> = {
    cash: "نقدي",
    card: "بطاقة",
    mixed: "مختلط",
    credit: "آجل",
  };
  const map = new Map<string, number>();
  for (const inv of data.salesInvoices) {
    if (inv.status !== "posted") continue;
    const t = invoiceTotalsOf(data, inv);
    map.set(inv.payMethod, (map.get(inv.payMethod) ?? 0) + t.total);
  }
  return [...map.entries()]
    .map(([k, v]) => ({ label: labels[k] ?? k, value: Math.round(v) }))
    .filter((r) => r.value > 0);
}

/** نسبة التغير بين آخر قيمتين فى سلسلة */
export function deltaPct(series: SeriesPoint[], key: string): number | undefined {
  if (series.length < 2) return undefined;
  const prev = Number(series[series.length - 2]?.[key] ?? 0);
  const curr = Number(series[series.length - 1]?.[key] ?? 0);
  if (!prev) return undefined;
  return ((curr - prev) / Math.abs(prev)) * 100;
}
