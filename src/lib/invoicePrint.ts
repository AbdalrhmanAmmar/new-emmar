/** طباعة فاتورة بيع بتنسيق A4 عربي (RTL) في نافذة منفصلة. */
import { getTable } from "@/lib/mockDb";

const money = (v: any) =>
  Number(v || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (v: any) => (v ? new Date(v).toLocaleDateString("en-GB") : "—");

export function printSalesInvoice(invoiceId: string) {
  const inv = getTable("acc_sales_invoices").find((i: any) => i.id === invoiceId);
  if (!inv) return;
  const lines = getTable("acc_sales_invoice_lines").filter((l: any) => l.invoice_id === invoiceId);
  const company = getTable("acc_company_profile")[0] ?? {};

  const rows = lines
    .map(
      (l: any, i: number) => `<tr>
      <td>${i + 1}</td>
      <td>${l.description ?? l.item_code ?? "—"}</td>
      <td>${Number(l.quantity || 0).toLocaleString("en-GB")}</td>
      <td>${l.unit ?? "كجم"}</td>
      <td>${money(l.unit_price)}</td>
      <td>${l.vat_rate ?? 0}%</td>
      <td>${money(l.line_total)}</td>
    </tr>`,
    )
    .join("");

  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>فاتورة ${inv.invoice_number}</title>
<style>
  *{box-sizing:border-box;font-family:"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif}
  body{margin:0;padding:24px;color:#152318;background:#fff}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1c5f3f;padding-bottom:12px}
  h1{font-size:20px;margin:0 0 4px}
  .muted{color:#5b6b60;font-size:12px}
  .meta{margin:16px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:13px}
  .meta div span{color:#5b6b60}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12.5px}
  th,td{border:1px solid #d6ded8;padding:7px 8px;text-align:center}
  th{background:#eef4f0;font-weight:700}
  td:nth-child(2){text-align:right}
  .totals{margin-top:14px;margin-inline-start:auto;width:300px;font-size:13px}
  .totals tr td:first-child{text-align:right;background:#f7faf8}
  .grand td{font-weight:800;background:#1c5f3f;color:#fff}
  footer{margin-top:28px;font-size:11px;color:#5b6b60;text-align:center}
  @media print{body{padding:0}}
</style></head><body>
<div class="head">
  <div>
    <h1>${company.name_ar ?? "الإيمان لتجارة الأعلاف"}</h1>
    <div class="muted">${company.address ?? ""} ${company.phone ? " — " + company.phone : ""}</div>
    <div class="muted">الرقم الضريبي: ${company.tax_number ?? "—"}</div>
  </div>
  <div style="text-align:left">
    <h1>فاتورة بيع</h1>
    <div class="muted">رقم: <b>${inv.invoice_number}</b></div>
    <div class="muted">التاريخ: ${dt(inv.issue_date)}</div>
  </div>
</div>

<div class="meta">
  <div><span>العميل:</span> <b>${inv.buyer_name ?? "—"}</b></div>
  <div><span>الرقم الضريبي للعميل:</span> ${inv.buyer_vat_number ?? "—"}</div>
  <div><span>أمر البيع:</span> ${inv.so_no ?? "—"}</div>
  <div><span>إذن التسليم:</span> ${inv.do_no ?? "—"}</div>
  <div><span>تاريخ الاستحقاق:</span> ${dt(inv.due_date)}</div>
  <div><span>قيد اليومية:</span> ${inv.journal_no ?? "—"}</div>
</div>

<table>
  <thead><tr><th>م</th><th>البيان</th><th>الكمية</th><th>الوحدة</th><th>سعر الوحدة</th><th>ض.ق.م</th><th>الإجمالي</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="7">لا توجد أسطر</td></tr>'}</tbody>
</table>

<table class="totals">
  <tr><td>الإجمالي قبل الضريبة</td><td>${money(inv.subtotal)} ج.م</td></tr>
  <tr><td>ضريبة القيمة المضافة</td><td>${money(inv.vat_total)} ج.م</td></tr>
  <tr class="grand"><td>الإجمالي المستحق</td><td>${money(inv.total)} ج.م</td></tr>
  <tr><td>المحصل</td><td>${money(inv.paid_amount)} ج.م</td></tr>
  <tr><td>الرصيد</td><td>${money(inv.balance)} ج.م</td></tr>
</table>

<footer>${company.name_ar ?? "الإيمان لتجارة الأعلاف"} — طُبعت في ${new Date().toLocaleString("en-GB")}</footer>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
