import type { DbShape, Invoice, Safe, Voucher } from "./mockDb";

/* ============================================================
 * منطق الخزينة: الأرصدة، الحركات، التسويات، التدفق النقدي.
 * مصدر واحد للحساب لمنع تداخل أو تكرار البيانات.
 * ============================================================ */

export interface Movement {
  id: string;
  date: string;
  docNo: string;
  docType: "receipt" | "payment" | "transfer-in" | "transfer-out" | "transfer-fee";
  safeId: string;
  debit: number; // داخل للخزينة
  credit: number; // خارج من الخزينة
  description: string;
  userId: string;
  reconciled: boolean;
  sourceId: string;
}

export function safeMovements(data: DbShape, safeId?: string): Movement[] {
  const rows: Movement[] = [];

  for (const v of data.vouchers) {
    if (v.status !== "posted") continue;
    if (safeId && v.safeId !== safeId) continue;
    rows.push({
      id: `${v.id}`,
      date: v.date,
      docNo: v.no,
      docType: v.kind,
      safeId: v.safeId,
      debit: v.kind === "receipt" ? v.amount : 0,
      credit: v.kind === "payment" ? v.amount : 0,
      description: v.note || (v.kind === "receipt" ? "سند قبض" : "سند صرف"),
      userId: v.userId,
      reconciled: v.reconciled,
      sourceId: v.id,
    });
  }

  for (const t of data.transfers) {
    if (t.status !== "posted") continue;
    if (!safeId || t.fromSafeId === safeId) {
      rows.push({
        id: `${t.id}-out`,
        date: t.date,
        docNo: t.no,
        docType: "transfer-out",
        safeId: t.fromSafeId,
        debit: 0,
        credit: t.amount,
        description: t.note || "تحويل صادر",
        userId: t.userId,
        reconciled: false,
        sourceId: t.id,
      });
      if (t.fee > 0) {
        rows.push({
          id: `${t.id}-fee`,
          date: t.date,
          docNo: t.no,
          docType: "transfer-fee",
          safeId: t.fromSafeId,
          debit: 0,
          credit: t.fee,
          description: "رسوم تحويل",
          userId: t.userId,
          reconciled: false,
          sourceId: t.id,
        });
      }
    }
    if (!safeId || t.toSafeId === safeId) {
      rows.push({
        id: `${t.id}-in`,
        date: t.date,
        docNo: t.no,
        docType: "transfer-in",
        safeId: t.toSafeId,
        debit: t.amount,
        credit: 0,
        description: t.note || "تحويل وارد",
        userId: t.userId,
        reconciled: false,
        sourceId: t.id,
      });
    }
  }

  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function safeBalance(data: DbShape, safeId: string): number {
  const safe = data.safes.find((s) => s.id === safeId);
  const opening = safe?.openingBalance ?? 0;
  return safeMovements(data, safeId).reduce((acc, m) => acc + m.debit - m.credit, opening);
}

export function safeBalanceAt(data: DbShape, safeId: string, upToDate: string): number {
  const safe = data.safes.find((s) => s.id === safeId);
  const opening = safe?.openingBalance ?? 0;
  return safeMovements(data, safeId)
    .filter((m) => m.date <= upToDate)
    .reduce((acc, m) => acc + m.debit - m.credit, opening);
}

export function totalsByType(data: DbShape) {
  const out = { cash: 0, bank: 0, wallet: 0, all: 0 };
  for (const s of data.safes) {
    if (!s.active) continue;
    const bal = safeBalance(data, s.id);
    if (s.type === "bank") out.bank += bal;
    else if (s.type === "wallet") out.wallet += bal;
    else out.cash += bal;
    out.all += bal;
  }
  return out;
}

/* ===================== الفواتير والتسوية ===================== */

export function invoiceRemaining(inv: Invoice): number {
  return Math.max(0, Number(inv.total) - Number(inv.paid));
}

export function invoiceStatus(inv: Invoice): "open" | "partial" | "paid" {
  const remaining = invoiceRemaining(inv);
  if (remaining <= 0.001) return "paid";
  if (Number(inv.paid) > 0) return "partial";
  return "open";
}

export const INVOICE_STATUS_LABEL = {
  open: "مفتوحة",
  partial: "مسددة جزئياً",
  paid: "مسددة",
} as const;

export function openInvoices(
  data: DbShape,
  kind: "sales" | "purchase",
  partyId: string | null,
): Invoice[] {
  return data.invoices.filter(
    (inv) =>
      inv.type === kind &&
      (!partyId || inv.partyId === partyId) &&
      invoiceRemaining(inv) > 0.001,
  );
}

/** تطبيق/إلغاء تأثير سند على الفواتير */
export function applyAllocations(data: DbShape, voucher: Voucher, sign: 1 | -1) {
  for (const alloc of voucher.allocations) {
    const inv = data.invoices.find((i) => i.id === alloc.invoiceId);
    if (!inv) continue;
    inv.paid = Math.max(0, Number(inv.paid) + sign * Number(alloc.amount));
  }
}

export function partyBalance(data: DbShape, kind: "sales" | "purchase", partyId: string): number {
  return data.invoices
    .filter((i) => i.type === kind && i.partyId === partyId)
    .reduce((acc, i) => acc + invoiceRemaining(i), 0);
}

export interface AgingRow {
  partyId: string;
  name: string;
  b0: number;
  b30: number;
  b60: number;
  b90: number;
  total: number;
}

export function aging(data: DbShape, kind: "sales" | "purchase"): AgingRow[] {
  const parties = kind === "sales" ? data.customers : data.suppliers;
  const now = new Date();
  const map = new Map<string, AgingRow>();

  for (const inv of data.invoices) {
    if (inv.type !== kind) continue;
    const remaining = invoiceRemaining(inv);
    if (remaining <= 0.001) continue;
    const party = parties.find((p) => p.id === inv.partyId);
    if (!party) continue;
    const row =
      map.get(party.id) ??
      { partyId: party.id, name: party.name, b0: 0, b30: 0, b60: 0, b90: 0, total: 0 };
    const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000);
    if (days <= 0) row.b0 += remaining;
    else if (days <= 30) row.b30 += remaining;
    else if (days <= 60) row.b60 += remaining;
    else row.b90 += remaining;
    row.total += remaining;
    map.set(party.id, row);
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

/* ===================== التدفق النقدي ===================== */

export interface FlowRow {
  key: string;
  inflow: number;
  outflow: number;
  net: number;
}

export function cashFlow(data: DbShape, groupBy: "day" | "month", safeId?: string): FlowRow[] {
  const map = new Map<string, FlowRow>();
  for (const m of safeMovements(data, safeId)) {
    if (m.docType === "transfer-in" || m.docType === "transfer-out") continue;
    const key = groupBy === "month" ? m.date.slice(0, 7) : m.date;
    const row = map.get(key) ?? { key, inflow: 0, outflow: 0, net: 0 };
    row.inflow += m.debit;
    row.outflow += m.credit;
    row.net = row.inflow - row.outflow;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export function activeSafes(data: DbShape): Safe[] {
  return data.safes.filter((s) => s.active);
}
