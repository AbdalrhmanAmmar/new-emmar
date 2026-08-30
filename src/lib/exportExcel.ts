/** تصدير الجداول إلى ملف Excel منسق بشكل احترافى (RTL) بدون مكتبات خارجية */

const GREEN = "#1d5c3f";

function esc(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function downloadFile(fileName: string, mime: string, content: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob(["\ufeff", content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "export";
}

export interface ExcelExportOptions {
  title: string;
  headers: string[];
  rows: string[][];
  subtitle?: string;
  fileName?: string;
}

/** يبنى ملف xls (HTML متوافق مع Excel) بتنسيق احترافى: ترويسة، عناوين ملونة، صفوف مخططة */
export function exportTableToExcel({ title, headers, rows, subtitle, fileName }: ExcelExportOptions) {
  const span = Math.max(1, headers.length);
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${esc(safeName(title)).slice(0, 28)}</x:Name>
<x:WorksheetOptions><x:DisplayRightToLeft/><x:FreezePanes/><x:SplitHorizontalPane>3</x:SplitHorizontalPane>
<x:TopRowBottomPane>3</x:TopRowBottomPane><x:ActivePane>2</x:ActivePane></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  table{border-collapse:collapse;font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;font-size:11pt}
  td,th{border:0.5pt solid #cfd9d1;padding:6px 8px;vertical-align:middle}
  .title{background:${GREEN};color:#ffffff;font-size:15pt;font-weight:bold;text-align:center;height:34px}
  .sub{background:#eef4ef;color:#3b4d43;font-size:10pt;text-align:center}
  th{background:#e7f0ea;color:${GREEN};font-weight:bold;text-align:center}
  td{text-align:right;mso-number-format:"\\@"}
  tr.alt td{background:#f8fbf9}
</style></head><body dir="rtl">
<table dir="rtl">
  <tr><td class="title" colspan="${span}">${esc(title)}</td></tr>
  <tr><td class="sub" colspan="${span}">${esc(
    subtitle ?? `الإيمان لتجارة الأعلاف — تاريخ التصدير ${new Date().toLocaleString("en-GB")}`,
  )}</td></tr>
  <tr>${headers.map((header) => `<th>${esc(header)}</th>`).join("")}</tr>
  ${rows
    .map(
      (row, index) =>
        `<tr class="${index % 2 ? "alt" : ""}">${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`,
    )
    .join("")}
</table></body></html>`;

  downloadFile(
    `${safeName(fileName ?? title)}-${new Date().toISOString().slice(0, 10)}.xls`,
    "application/vnd.ms-excel",
    html,
  );
}

/** تنزيل مستند HTML جاهز للطباعة (فاتورة / إذن) على جهاز المستخدم */
export function downloadHtmlDoc(fileName: string, html: string) {
  downloadFile(`${safeName(fileName)}.html`, "text/html", html);
}
