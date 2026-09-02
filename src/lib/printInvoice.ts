import { downloadHtmlDoc } from "@/lib/exportExcel";
import { dateFmt, money, num } from "@/lib/format";
import { lineUnitLabel } from "@/lib/units";
import { SALES_PAY_LABEL, type DbShape, type InvoiceCharge, type OrgSettings, type SalesInvoice, type SalesLine } from "@/lib/mockDb";
import { lineTotals } from "@/lib/sales";

export interface InvoicePrintTotals {
  gross: number;
  discount: number;
  net: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  /** إجمالى البنود الإضافية */
  charges?: number;
}

export interface InvoicePrintInput {
  no: string;
  date: string;
  dueDate: string;
  customer: string;
  customerPhone?: string;
  customerCode?: string;
  customerAddress?: string;
  customerCity?: string;
  customerEmail?: string;
  customerContact?: string;
  customerCommercialNo?: string;
  customerTaxNo?: string;
  customerTaxOffice?: string;
  customerActivity?: string;
  branch: string;
  warehouse: string;
  rep: string;
  payMethod: SalesInvoice["payMethod"];
  discountCode?: string;
  note?: string;
  status?: string;
  lines: SalesLine[];
  /** بنود إضافية على الفاتورة */
  charges?: InvoiceCharge[];
  totals: InvoicePrintTotals;
  org: OrgSettings;
  /** عنوان المستند (افتراضياً فاتورة مبيعات) */
  docTitle?: string;
  /** مسمى الطرف (العميل / المورد) */
  partyLabel?: string;
  /** مقاس الورق للطباعة — A4 (افتراضى) أو A5 مضغوط */
  paper?: PaperSize;
}

/** مقاسات الطباعة المدعومة */
export type PaperSize = "A4" | "A5";



/* ===================== تفقيط المبالغ بالعربي ===================== */

const ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const TEENS = [
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر",
];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

function below1000(value: number): string {
  const parts: string[] = [];
  const h = Math.floor(value / 100);
  const rest = value % 100;
  if (h) parts.push(HUNDREDS[h]!);
  if (rest >= 10 && rest < 20) parts.push(TEENS[rest - 10]!);
  else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    if (o) parts.push(ONES[o]!);
    if (t) parts.push(TENS[t]!);
  }
  return parts.filter(Boolean).join(" و");
}

function groupWord(count: number, forms: [string, string, string]): string {
  if (count === 1) return forms[0];
  if (count === 2) return forms[1];
  return forms[2];
}

/** تفقيط المبلغ بالجنيه المصري */
export function amountInWords(value: number): string {
  const total = Math.round(Number(value || 0) * 100);
  const pounds = Math.floor(total / 100);
  const piasters = total % 100;
  if (pounds === 0 && piasters === 0) return "صفر جنيه مصري فقط";

  const groups: Array<{ n: number; forms: [string, string, string] }> = [
    { n: Math.floor(pounds / 1_000_000) % 1000, forms: ["مليون", "مليونان", "ملايين"] },
    { n: Math.floor(pounds / 1000) % 1000, forms: ["ألف", "ألفان", "آلاف"] },
    { n: pounds % 1000, forms: ["", "", ""] },
  ];

  const words: string[] = [];
  groups.forEach(({ n, forms }, index) => {
    if (!n) return;
    if (index === 2) {
      words.push(below1000(n));
      return;
    }
    if (n === 1 || n === 2) words.push(groupWord(n, forms));
    else words.push(`${below1000(n)} ${n <= 10 ? forms[2] : forms[0]}`);
  });

  let out = words.filter(Boolean).join(" و");
  out = `${out} جنيه مصري`;
  if (piasters) out += ` و${below1000(piasters)} قرش`;
  return `${out} فقط لا غير`;
}

/* ===================== بناء بيانات الطباعة ===================== */

export function invoicePrintInput(
  data: DbShape,
  inv: Pick<
    SalesInvoice,
    "no" | "date" | "dueDate" | "branchId" | "warehouseId" | "repId" | "customerId" | "customerName" | "lines" | "charges" | "payMethod" | "discountCode" | "note" | "status"
  >,
  totals: InvoicePrintTotals,
): InvoicePrintInput {
  const customer = inv.customerId ? data.customers.find((c) => c.id === inv.customerId) : undefined;
  return {
    no: inv.no,
    date: inv.date,
    dueDate: inv.dueDate,
    customer: customer?.name ?? (inv.customerName || "عميل نقدي"),
    customerPhone: [customer?.phone, customer?.phone2].filter(Boolean).join(" / ") || undefined,
    customerCode: customer?.code,
    customerAddress: customer?.address,
    customerCity: customer?.city,
    customerEmail: customer?.email,
    customerContact: customer?.contactPerson,
    customerCommercialNo: customer?.commercialNo,
    customerTaxNo: customer?.taxNo,
    customerTaxOffice: customer?.taxOffice,
    customerActivity: customer?.activity,
    branch: data.branches.find((b) => b.id === inv.branchId)?.name ?? "-",
    warehouse: data.warehouses.find((w) => w.id === inv.warehouseId)?.name ?? "-",
    rep: data.reps.find((r) => r.id === inv.repId)?.name ?? "-",
    payMethod: inv.payMethod,
    discountCode: inv.discountCode,
    note: inv.note,
    status: inv.status === "posted" ? "مرحّلة" : inv.status === "draft" ? "مسودة" : "ملغاة",
    lines: inv.lines,
    charges: inv.charges,
    totals,
    org: data.settings,
  };

}

/* ===================== الطباعة الاحترافية ===================== */

/** يبنى مستند الفاتورة الاحترافى كنص HTML كامل (يُستخدم للطباعة والتنزيل) */
function partyRow(label: string, value?: string): string {
  if (!value || !value.trim()) return "";
  return `<div class="row"><span>${label}</span><span>${value}</span></div>`;
}

/** إيصال كاشير (Receipt) على مقاس A5 — شبيه بمخرجات ماكينات الكاشير الحرارية */
function receiptHtml(input: InvoicePrintInput): string {
  const t = input.totals;
  const org = input.org;
  const items = input.lines
    .map((line, i) => {
      const lt = lineTotals(line);
      return `<div class="it">
        <div class="nm"><span>${i + 1}. ${line.name}</span><span class="v">${num(lt.total)}</span></div>
        <div class="mt">${num(line.qty)} ${lineUnitLabel(line)} × ${num(line.price)}${
          lt.discount ? ` — خصم ${num(lt.discount)}` : ""
        }${line.code ? ` — كود ${line.code}` : ""}</div>
      </div>`;
    })
    .join("");

  const totLine = (k: string, v: string, cls = "") => `<div class="tr ${cls}"><span>${k}</span><span>${v}</span></div>`;

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>${input.docTitle ?? "فاتورة مبيعات"} ${input.no} — A5</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  @page{size:A5 portrait;margin:6mm}
  *{box-sizing:border-box}
  body{font-family:'IBM Plex Sans Arabic',sans-serif;margin:0;padding:10px;background:#fff;color:#111}
  .rc{width:76mm;margin:0 auto;font-size:11px;line-height:1.65}
  .ctr{text-align:center}
  .logo{width:44px;height:44px;border-radius:50%;object-fit:cover;margin:0 auto 4px;display:block}
  .mark{width:44px;height:44px;border-radius:50%;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;margin:0 auto 4px}
  .co{font-size:14px;font-weight:700;letter-spacing:.2px}
  .tiny{font-size:9.5px;color:#444}
  .hr{border-top:1px dashed #999;margin:6px 0}
  .doct{font-size:12px;font-weight:700;margin:2px 0}
  .kv{display:flex;justify-content:space-between;gap:6px;font-size:10px}
  .kv span:first-child{color:#555}
  .it{padding:3px 0;border-bottom:1px dotted #ccc}
  .it:last-child{border-bottom:0}
  .nm{display:flex;justify-content:space-between;gap:6px;font-weight:600}
  .nm .v{font-variant-numeric:tabular-nums;white-space:nowrap}
  .mt{font-size:9.5px;color:#555}
  .tr{display:flex;justify-content:space-between;gap:6px;font-size:10.5px;padding:1.5px 0}
  .tr span:last-child{font-variant-numeric:tabular-nums;font-weight:600}
  .tr.big{font-size:13px;font-weight:700;border-top:1px solid #111;border-bottom:1px solid #111;padding:4px 0;margin:3px 0}
  .words{font-size:9.5px;color:#333;text-align:center;margin-top:4px}
  .thx{text-align:center;font-size:10.5px;font-weight:600;margin-top:6px}
  .bars{margin:7px auto 0;height:32px;width:64mm;background:repeating-linear-gradient(90deg,#111 0 1px,#fff 1px 3px,#111 3px 5px,#fff 5px 8px)}
  @media print{body{padding:0}}
</style></head><body><div class="rc">
  <div class="ctr">
    ${org.logoDataUrl
      ? `<img class="logo" src="${org.logoDataUrl}" alt="" />`
      : `<div class="mark">${org.logoLetter || "إ"}</div>`}
    <div class="co">${org.companyName}</div>
    <div class="tiny">${org.activity || ""}</div>
    <div class="tiny">${org.address || ""}</div>
    <div class="tiny">ت: ${[org.phone, org.phone2].filter(Boolean).join(" / ") || "—"}</div>
    <div class="tiny">س.ت: ${org.commercialNo || "—"} • ض: ${org.taxNo || "—"}</div>
    <div class="hr"></div>
    <div class="doct">${input.docTitle ?? "فاتورة مبيعات"}</div>
  </div>
  <div class="kv"><span>رقم</span><span>${input.no}</span></div>
  <div class="kv"><span>التاريخ</span><span>${dateFmt(input.date)} ${new Date().toLocaleTimeString("en-GB")}</span></div>
  <div class="kv"><span>${input.partyLabel ?? "العميل"}</span><span>${input.customer}</span></div>
  ${input.customerPhone ? `<div class="kv"><span>الهاتف</span><span>${input.customerPhone}</span></div>` : ""}
  <div class="kv"><span>${input.partyLabel === "المورد" ? "المستلم" : "المندوب"}</span><span>${input.rep}</span></div>
  <div class="kv"><span>الدفع</span><span>${SALES_PAY_LABEL[input.payMethod]}</span></div>
  <div class="hr"></div>
  ${items || `<div class="ctr tiny">لا توجد أصناف</div>`}
  <div class="hr"></div>
  ${totLine("الإجمالي", money(t.gross))}
  ${t.discount ? totLine("الخصم", money(t.discount)) : ""}
  ${totLine("الصافي", money(t.net))}
  ${totLine(`ض.ق.م ${num(org.vatRate)}%`, money(t.tax))}
  ${(input.charges ?? []).map((c) => totLine(c.label || "بند إضافى", money(c.amount))).join("")}
  ${totLine("المستحق", money(t.total), "big")}
  ${totLine("المدفوع", money(t.paid))}
  ${totLine("المتبقي", money(t.remaining))}
  <div class="words">${amountInWords(t.total)}</div>
  ${input.note ? `<div class="words">ملاحظات: ${input.note}</div>` : ""}
  ${org.invoiceTerms ? `<div class="words">${org.invoiceTerms}</div>` : ""}
  <div class="hr"></div>
  <div class="thx">${org.printFooter || "شكرًا لتعاملكم معنا"}</div>
  ${org.website ? `<div class="tiny ctr">${org.website}</div>` : ""}
  <div class="bars"></div>
  <div class="tiny ctr">${input.no}</div>
</div></body></html>`;
}

export function salesInvoiceHtml(input: InvoicePrintInput): string {
  if ((input.paper ?? "A4") === "A5") return receiptHtml(input);
  const rows = input.lines
    .map((line, index) => {
      const t = lineTotals(line);
      return `<tr>
        <td class="c">${index + 1}</td>
        <td class="c">${line.code || "—"}</td>
        <td>${line.name}</td>
        <td class="c">${num(line.qty)}</td>
        <td class="c">${lineUnitLabel(line)}</td>
        <td class="n">${num(line.price)}</td>
        <td class="n">${num(t.discount)}</td>
        <td class="n">${num(t.tax)}</td>
        <td class="n b">${num(t.total)}</td>
      </tr>`;
    })
    .join("");

  const t = input.totals;
  const org = input.org;
  const chargeList = (input.charges ?? []).filter((c) => Number(c.amount || 0) !== 0 || (c.label || "").trim());
  const chargesTotal = chargeList.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const chargesTable = chargeList.length
    ? `<table class="items charges">
    <thead><tr><th>م</th><th>البند الإضافي</th><th>القيمة</th></tr></thead>
    <tbody>${chargeList
      .map((c, i) => `<tr><td class="c">${i + 1}</td><td>${c.label || "بند إضافى"}</td><td class="n b">${num(c.amount)}</td></tr>`)
      .join("")}
    <tr class="sumrow"><td class="c">—</td><td>إجمالي البنود الإضافية</td><td class="n b">${num(chargesTotal)}</td></tr></tbody>
  </table>`
    : "";

  const totalsRows: Array<[string, string, boolean]> = [
    ["الإجمالي قبل الخصم", money(t.gross), false],
    ["إجمالي الخصم", money(t.discount), false],
    ["الصافي بعد الخصم", money(t.net), false],
    [`ضريبة القيمة المضافة (${num(org.vatRate)}%)`, money(t.tax), false],
    ...chargeList.map((c) => [`بند إضافي: ${c.label || "بند إضافى"}`, money(c.amount), false] as [string, string, boolean]),
    ...(chargeList.length ? [["إجمالي البنود الإضافية", money(chargesTotal), false] as [string, string, boolean]] : []),
    ["الإجمالي المستحق", money(t.total), true],
    ["المدفوع", money(t.paid), false],
    ["المتبقي", money(t.remaining), true],
  ];


  const paper: PaperSize = input.paper ?? "A4";
  const a5 = paper === "A5";

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>${input.docTitle ?? "فاتورة مبيعات"} ${input.no} — ${paper}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  @page{size:${a5 ? "A5 portrait" : "A4 portrait"};margin:${a5 ? "7mm" : "12mm"}}
  *{box-sizing:border-box}
  body{font-family:'IBM Plex Sans Arabic',sans-serif;margin:0;padding:26px;color:#13251c;background:#fff}
  .doc{max-width:820px;margin:0 auto}
  .top{display:flex;justify-content:space-between;gap:18px;border-bottom:3px solid #1d5c3f;padding-bottom:14px}
  .brand{display:flex;gap:12px;align-items:flex-start}
  .mark{width:52px;height:52px;border-radius:50%;background:#1d5c3f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700}
  .co{font-size:19px;font-weight:700;color:#1d5c3f}
  .sub{font-size:11px;color:#5b6b60;margin-top:3px;line-height:1.6}
  .doctag{text-align:left}
  .doctag h1{font-size:20px;margin:0;color:#1d5c3f}
  .chip{display:inline-block;margin-top:6px;background:#eef4ef;border:1px solid #cfe0d5;border-radius:999px;padding:3px 12px;font-size:11px;font-weight:600}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
  .box{border:1px solid #d7e2da;border-radius:10px;overflow:hidden}
  .box h2{margin:0;background:#f4f8f5;padding:7px 10px;font-size:12px;color:#1d5c3f;border-bottom:1px solid #d7e2da}
  .box .row{display:flex;justify-content:space-between;gap:8px;padding:5px 10px;font-size:12px;border-bottom:1px dashed #e6ede8}
  .box .row:last-child{border-bottom:0}
  .box .row span:first-child{color:#66766b}
  .box .row span:last-child{font-weight:600}
  table.items{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:6px}
  table.items th{background:#1d5c3f;color:#fff;padding:7px 6px;font-weight:600;text-align:center;border:1px solid #1d5c3f}
  table.items td{border:1px solid #d7e2da;padding:6px;text-align:right}
  table.items tbody tr:nth-child(even){background:#f8fbf9}
  td.c{text-align:center}
  td.n{text-align:left;font-variant-numeric:tabular-nums}
  td.b{font-weight:700}
  .bottom{display:grid;grid-template-columns:1fr 320px;gap:14px;margin-top:14px;align-items:start}
  .words{border:1px solid #d7e2da;border-radius:10px;padding:10px;font-size:12px;line-height:1.9}
  .words b{color:#1d5c3f}
  table.tot{width:100%;border-collapse:collapse;font-size:12px}
  table.tot td{border:1px solid #d7e2da;padding:7px 9px}
  table.tot td:first-child{background:#f4f8f5;color:#4a5a50}
  table.tot td:last-child{text-align:left;font-weight:600;font-variant-numeric:tabular-nums}
  table.tot tr.big td{background:#1d5c3f;color:#fff;font-size:13px;font-weight:700}
  .sig{margin-top:38px;display:flex;justify-content:space-between;font-size:11.5px}
  .sig div{border-top:1px solid #9db0a4;padding-top:6px;width:29%;text-align:center;color:#4a5a50}
  .foot{margin-top:16px;border-top:1px dashed #cfd9d1;padding-top:8px;font-size:10.5px;color:#7c8a81;text-align:center}
  @media print{body{padding:0}.doc{max-width:none}}
  ${a5
    ? `/* نسخة A5 مضغوطة بنفس الهوية الرسمية */
  body{padding:14px;font-size:11px}
  .doc{max-width:560px}
  .top{padding-bottom:9px;border-bottom-width:2px}
  .mark{width:40px;height:40px;font-size:18px}
  .co{font-size:15px}
  .sub{font-size:9.5px;line-height:1.55}
  .doctag h1{font-size:15px}
  .chip{font-size:9.5px;padding:2px 9px;margin-top:4px}
  .grid{gap:8px;margin:10px 0}
  .box h2{font-size:10.5px;padding:5px 8px}
  .box .row{font-size:10px;padding:3.5px 8px}
  table.items{font-size:9.5px}
  table.items th{padding:5px 4px}
  table.items td{padding:4px}
  .bottom{grid-template-columns:1fr 230px;gap:9px;margin-top:9px}
  .words{font-size:10px;line-height:1.7;padding:8px}
  table.tot{font-size:10px}
  table.tot td{padding:4.5px 7px}
  table.tot tr.big td{font-size:11px}
  .sig{margin-top:22px;font-size:9.5px}
  .foot{margin-top:10px;font-size:9px;padding-top:6px}`
    : ""}
</style></head><body class="paper-${paper.toLowerCase()}"><div class="doc">
  <div class="top">
    <div class="brand">
      ${org.logoDataUrl
        ? `<img class="mark" src="${org.logoDataUrl}" alt="" style="object-fit:cover;border-radius:50%;background:#fff" />`
        : `<div class="mark">${org.logoLetter || "إ"}</div>`}
      <div>
        <div class="co">${org.companyName}</div>
        <div class="sub">${org.companyNameEn} — ${org.address}<br/>${org.activity}<br/>
        س.ت: ${org.commercialNo || "—"} • رقم ضريبى: ${org.taxNo || "—"} • ت: ${[org.phone, org.phone2].filter(Boolean).join(" / ") || "—"}</div>
      </div>
    </div>

    <div class="doctag">
      <h1>${input.docTitle ?? "فاتورة مبيعات"}</h1>
      <div class="sub">رقم: <b>${input.no}</b><br/>تاريخ: ${dateFmt(input.date)}</div>
      <div class="chip">${input.status ?? ""} — ${SALES_PAY_LABEL[input.payMethod]}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <h2>بيانات ${input.partyLabel ?? "العميل"}</h2>
      <div class="row"><span>الاسم</span><span>${input.customer}${input.customerCode ? ` (${input.customerCode})` : ""}</span></div>
      <div class="row"><span>الهاتف</span><span>${input.customerPhone ?? "—"}</span></div>
      ${partyRow("العنوان", [input.customerAddress, input.customerCity].filter(Boolean).join(" — "))}
      ${partyRow("مسؤول التعامل", input.customerContact)}
      ${partyRow("البريد الإلكتروني", input.customerEmail)}
      ${partyRow("السجل التجاري", input.customerCommercialNo)}
      ${partyRow("الرقم الضريبي", input.customerTaxNo)}
      ${partyRow("المأمورية الضريبية", input.customerTaxOffice)}
      ${partyRow("النشاط", input.customerActivity)}
      <div class="row"><span>تاريخ الاستحقاق</span><span>${dateFmt(input.dueDate)}</span></div>
      <div class="row"><span>كود الخصم</span><span>${input.discountCode || "—"}</span></div>
    </div>
    <div class="box">
      <h2>بيانات الإصدار</h2>
      <div class="row"><span>الفرع</span><span>${input.branch}</span></div>
      <div class="row"><span>المخزن</span><span>${input.warehouse}</span></div>
      <div class="row"><span>${input.partyLabel === "المورد" ? "المستلم" : "المندوب"}</span><span>${input.rep}</span></div>
      <div class="row"><span>عدد الأصناف</span><span>${input.lines.length}</span></div>
    </div>
  </div>

  <table class="items">
    <thead><tr>
      <th>م</th><th>الكود</th><th>الصنف</th><th>الكمية</th><th>الوحدة</th>
      <th>سعر الوحدة</th><th>الخصم</th><th>الضريبة</th><th>الإجمالي</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="9" class="c">لا توجد أصناف</td></tr>`}</tbody>
  </table>

  ${chargesTable}


  <div class="bottom">
    <div class="words">
      <b>المبلغ كتابةً:</b> ${amountInWords(t.total)}
      ${input.note ? `<br/><b>ملاحظات:</b> ${input.note}` : ""}
      ${org.invoiceTerms ? `<br/><b>الشروط:</b> ${org.invoiceTerms}` : ""}
    </div>
    <table class="tot">
      ${totalsRows
        .map(([k, v, big]) => `<tr class="${big ? "big" : ""}"><td>${k}</td><td>${v}</td></tr>`)
        .join("")}
    </table>
  </div>

  ${org.showSignatures ? `<div class="sig"><div>المحاسب</div><div>أمين المخزن</div><div>توقيع العميل</div></div>` : ""}
  <div class="foot">${org.printFooter} ${org.website ? `— ${org.website}` : ""} — تاريخ الطباعة ${new Date().toLocaleString("en-GB")}</div>
</div></body></html>`;
}

export function printSalesInvoice(input: InvoicePrintInput, paper?: PaperSize) {
  if (typeof window === "undefined") return;
  const doc = { ...input, paper: paper ?? input.paper ?? "A4" };
  const win = window.open("", "_blank", doc.paper === "A5" ? "width=460,height=880" : "width=980,height=1100");
  if (!win) return;
  win.document.write(salesInvoiceHtml(doc));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 450);
}

/** تنزيل الفاتورة كملف على جهاز المستخدم (يمكن فتحه وطباعته أو حفظه PDF) */
export function downloadSalesInvoice(input: InvoicePrintInput, paper?: PaperSize) {
  const doc = { ...input, paper: paper ?? input.paper ?? "A4" };
  downloadHtmlDoc(`${doc.docTitle ?? "فاتورة"}-${doc.no}-${doc.paper}`, salesInvoiceHtml(doc));
}
