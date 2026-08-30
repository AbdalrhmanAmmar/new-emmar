/**
 * طباعة عامة لأي سجل (إذن / حركة / فاتورة / قيد ...) بتنسيق A4 عربي RTL.
 * تُبنى المستند من بيانات الصف في الجدول (العناوين + القيم) بدون الحاجة
 * لتخصيص كل صفحة على حدة.
 */
import { getTable } from "@/lib/mockDb";

export type PrintField = { label: string; value: string };

const companyName = () => {
  try {
    const c = getTable("acc_company_profile")[0] as any;
    return {
      name: c?.name_ar ?? "الإيمان لتجارة الأعلاف",
      address: c?.address ?? "",
      phone: c?.phone ?? "",
      tax: c?.tax_number ?? "—",
    };
  } catch {
    return { name: "الإيمان لتجارة الأعلاف", address: "", phone: "", tax: "—" };
  }
};

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** يفتح نافذة طباعة تحتوي مستنداً منسقاً من عنوان + حقول (تسمية/قيمة). */
export function printDocument(opts: {
  title: string;
  subtitle?: string;
  fields: PrintField[];
  note?: string;
}) {
  const co = companyName();
  const rows = opts.fields
    .filter((f) => f.label && f.value && f.value !== "—")
    .map(
      (f) =>
        `<tr><th>${esc(f.label)}</th><td>${esc(f.value)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>${esc(opts.title)}</title>
<style>
  *{box-sizing:border-box;font-family:"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif}
  body{margin:0;padding:24px;color:#152318;background:#fff}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1c5f3f;padding-bottom:12px}
  h1{font-size:19px;margin:0 0 4px}
  .muted{color:#5b6b60;font-size:12px}
  table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}
  th,td{border:1px solid #d6ded8;padding:8px 10px;text-align:right}
  th{background:#eef4f0;font-weight:700;width:220px}
  .sign{margin-top:46px;display:flex;justify-content:space-between;font-size:12.5px;color:#3d4f44}
  .sign div{border-top:1px dashed #9fb3a6;padding-top:6px;width:30%;text-align:center}
  footer{margin-top:26px;font-size:11px;color:#5b6b60;text-align:center}
  @media print{body{padding:0}}
</style></head><body>
<div class="head">
  <div>
    <h1>${esc(co.name)}</h1>
    <div class="muted">${esc(co.address)}${co.phone ? " — " + esc(co.phone) : ""}</div>
    <div class="muted">الرقم الضريبي: ${esc(co.tax)}</div>
  </div>
  <div style="text-align:left">
    <h1>${esc(opts.title)}</h1>
    ${opts.subtitle ? `<div class="muted">${esc(opts.subtitle)}</div>` : ""}
    <div class="muted">تاريخ الطباعة: ${new Date().toLocaleDateString("en-GB")}</div>
  </div>
</div>

<table><tbody>${rows || '<tr><td>لا توجد بيانات</td></tr>'}</tbody></table>
${opts.note ? `<p class="muted" style="margin-top:14px">${esc(opts.note)}</p>` : ""}

<div class="sign"><div>المُعِد</div><div>المراجع</div><div>المستلم</div></div>
<footer>${esc(co.name)} — ${new Date().toLocaleString("en-GB")}</footer>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

/**
 * يستخرج بيانات الصف الذي يحتوي العنصر المُمرَّر (من داخل الجدول)
 * ويطبعها كمستند. يعتمد على عناوين الأعمدة في thead.
 */
export function printTableRow(el: HTMLElement | null, title = "مستند") {
  const tr = el?.closest("tr");
  const table = tr?.closest("table");
  if (!tr || !table) return;

  const heads = Array.from(table.querySelectorAll("thead th")).map((th) =>
    (th.textContent ?? "").trim(),
  );
  const cells = Array.from(tr.children) as HTMLElement[];

  const fields: PrintField[] = cells.map((td, i) => ({
    label: heads[i] ?? `عمود ${i + 1}`,
    value: (td.innerText ?? "").replace(/\s+/g, " ").trim(),
  }));

  // أول قيمة غير فارغة تُستخدم كرقم المستند
  const ref = fields.find((f) => f.value && f.value !== "—")?.value;
  printDocument({ title, subtitle: ref ? `رقم/مرجع: ${ref}` : undefined, fields });
}
