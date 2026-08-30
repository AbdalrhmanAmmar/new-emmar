/** طباعة مستند A4 بالعربي (RTL) في نافذة منفصلة */
export function printHtml(title: string, bodyHtml: string) {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;
  win.document.write(`<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  *{box-sizing:border-box}
  body{font-family:'IBM Plex Sans Arabic',sans-serif;padding:28px;color:#132a1f;margin:0}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1d5c3f;padding-bottom:12px;margin-bottom:18px}
  .co{font-size:20px;font-weight:700;color:#1d5c3f}
  .sub{font-size:12px;color:#5b6b60;margin-top:4px}
  h1{font-size:18px;margin:0 0 14px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #cfd9d1;padding:7px 8px}
  th{background:#eef4ef;text-align:center;font-weight:600}
  td{text-align:right}
  .kv{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px}
  .kv td{border:1px solid #cfd9d1;padding:8px}
  .kv td:nth-child(odd){background:#f6faf7;width:16%;font-weight:600}
  .tot{margin-top:16px;font-size:15px;font-weight:700;text-align:left}
  .sig{margin-top:46px;display:flex;justify-content:space-between;font-size:12px}
  .sig div{border-top:1px solid #98a89d;padding-top:6px;width:30%;text-align:center}
  @media print{body{padding:0}}
</style></head><body>
<div class="head">
  <div><div class="co">الإيمان لتجارة الأعلاف</div><div class="sub">AL-IMAN FEED TRADING CO — جمهورية مصر العربية</div></div>
  <div class="sub">تاريخ الطباعة: ${new Date().toLocaleDateString("en-GB")}</div>
</div>
${bodyHtml}
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export function printRecord(
  title: string,
  fields: Array<[string, string]>,
  table?: { headers: string[]; rows: string[][] },
  totalLine?: string,
) {
  const kv = `<table class="kv">${chunk(fields, 2)
    .map(
      (pair) =>
        `<tr>${pair.map(([k, v]) => `<td>${k}</td><td>${v}</td>`).join("")}${
          pair.length === 1 ? "<td></td><td></td>" : ""
        }</tr>`,
    )
    .join("")}</table>`;

  const tbl = table
    ? `<table><thead><tr>${table.headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
<tbody>${table.rows
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`
    : "";

  printHtml(
    title,
    `<h1>${title}</h1>${kv}${tbl}${totalLine ? `<div class="tot">${totalLine}</div>` : ""}
<div class="sig"><div>أمين الخزينة</div><div>المحاسب</div><div>المستلم</div></div>`,
  );
}

export function printTable(title: string, headers: string[], rows: string[][]) {
  printHtml(
    title,
    `<h1>${title}</h1><table><thead><tr>${headers
      .map((h) => `<th>${h}</th>`)
      .join("")}</tr></thead><tbody>${rows
      .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>`,
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
