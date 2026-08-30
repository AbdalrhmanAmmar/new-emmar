import { dateFmt, money } from "@/lib/format";
import { getDb, type DbShape, type SalesInvoice } from "@/lib/mockDb";
import type { InvoicePrintTotals } from "@/lib/printInvoice";

/** بناء نص رسالة الفاتورة من الصيغة المحددة فى الإعدادات الرئيسية */
export function renderInvoiceMessage(
  data: DbShape,
  inv: Pick<SalesInvoice, "no" | "date" | "customerId" | "customerName" | "lines">,
  totals: Pick<InvoicePrintTotals, "total" | "paid" | "remaining">,
): string {
  const customer = inv.customerId ? data.customers.find((c) => c.id === inv.customerId) : undefined;
  const items = inv.lines.map((l) => `${l.name} × ${l.qty}`).join(" ، ");
  const map: Record<string, string> = {
    "{customer}": customer?.name ?? (inv.customerName || "عميلنا"),
    "{no}": inv.no,
    "{date}": dateFmt(inv.date),
    "{items}": items || "-",
    "{total}": money(totals.total),
    "{paid}": money(totals.paid),
    "{remaining}": money(totals.remaining),
    "{company}": data.settings.companyName,
    "{phone}": [data.settings.phone, data.settings.phone2].filter(Boolean).join(" / "),
  };
  return Object.entries(map).reduce(
    (text, [key, value]) => text.split(key).join(value),
    data.settings.invoiceMsgTemplate || "فاتورة رقم {no} بإجمالي {total}",
  );
}

/** تحويل رقم مصرى إلى صيغة واتساب الدولية */
export function waPhone(phone: string): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return `20${digits}`;
}

export function openWhatsApp(phone: string, message: string): boolean {
  const target = waPhone(phone);
  if (typeof window === "undefined" || !target) return false;
  window.open(`https://wa.me/${target}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  return true;
}

export interface NotifyResult {
  sent: boolean;
  reason?: string;
}

/** إرسال رسالة الفاتورة للعميل عبر واتساب (يدوى) */
export function sendInvoiceMessage(
  inv: Pick<SalesInvoice, "no" | "date" | "customerId" | "customerName" | "lines">,
  totals: Pick<InvoicePrintTotals, "total" | "paid" | "remaining">,
): NotifyResult {
  const data = getDb();
  const customer = inv.customerId ? data.customers.find((c) => c.id === inv.customerId) : undefined;
  if (!customer) return { sent: false, reason: "الفاتورة غير مرتبطة بعميل مُكوّد" };
  if (!customer.phone) return { sent: false, reason: `لا يوجد رقم هاتف للعميل ${customer.name}` };
  const message = renderInvoiceMessage(data, inv, totals);
  return openWhatsApp(customer.phone, message)
    ? { sent: true }
    : { sent: false, reason: "تعذر فتح واتساب" };
}

/** إرسال تلقائى عند ترحيل فاتورة مبيعات — يحترم إعداد العميل وإعداد النظام */
export function autoNotifyOnPost(
  inv: Pick<SalesInvoice, "no" | "date" | "customerId" | "customerName" | "lines" | "status">,
  totals: Pick<InvoicePrintTotals, "total" | "paid" | "remaining">,
): NotifyResult {
  const data = getDb();
  if (inv.status !== "posted") return { sent: false, reason: "الفاتورة مسودة" };
  if (!data.settings.autoSendInvoiceMsg) return { sent: false, reason: "الإرسال التلقائى موقوف من الإعدادات" };
  const customer = inv.customerId ? data.customers.find((c) => c.id === inv.customerId) : undefined;
  if (!customer?.notifyInvoice) return { sent: false, reason: "العميل غير مُفعّل لإرسال الرسائل" };
  return sendInvoiceMessage(inv, totals);
}
