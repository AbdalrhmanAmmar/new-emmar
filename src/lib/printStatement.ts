import { dateFmt, money, num } from "@/lib/format";
import { printHtml } from "@/lib/printDoc";
import type { CustomerLedger } from "@/lib/customerLedger";

export interface StatementParty {
  name: string;
  code: string;
  phone: string;
}

/** طباعة كشف حساب عميل احترافى A4 — كل المسحوبات والمسددات والرصيد */
export function printCustomerStatement(
  party: StatementParty,
  ledger: CustomerLedger,
  range: { from?: string; to?: string },
) {
  const info = `<table class="kv">
    <tr><td>اسم العميل</td><td>${party.name}</td><td>كود العميل</td><td>${party.code || "—"}</td></tr>
    <tr><td>الهاتف</td><td>${party.phone || "—"}</td><td>الفترة</td><td>${
      range.from || range.to
        ? `${range.from ? dateFmt(range.from) : "البداية"} — ${range.to ? dateFmt(range.to) : "حتى الآن"}`
        : "كل الفترات"
    }</td></tr>
  </table>`;

  const rows = ledger.rows.length
    ? ledger.rows
        .map(
          (r, i) => `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td style="text-align:center">${dateFmt(r.date)}</td>
        <td style="text-align:center">${r.kind === "invoice" ? "فاتورة بيع" : "سداد / تحصيل"}</td>
        <td style="text-align:center">${r.ref}</td>
        <td>${r.desc}</td>
        <td style="text-align:center">${r.debit ? num(r.debit) : "—"}</td>
        <td style="text-align:center">${r.credit ? num(r.credit) : "—"}</td>
        <td style="text-align:center;font-weight:600">${num(r.balance)}</td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="8" style="text-align:center">لا توجد حركات فى هذه الفترة</td></tr>`;

  const table = `<table>
    <thead><tr>
      <th>م</th><th>التاريخ</th><th>نوع الحركة</th><th>المستند</th><th>البيان</th>
      <th>مدين (عليه)</th><th>دائن (سدد)</th><th>الرصيد</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <th colspan="5">الإجماليات</th>
      <th>${num(ledger.totalDebit)}</th>
      <th>${num(ledger.totalCredit)}</th>
      <th>${num(ledger.balance)}</th>
    </tr></tfoot>
  </table>`;

  const summary = `<div class="tot">
    إجمالى المسحوبات: ${money(ledger.totalDebit)} &nbsp;|&nbsp; إجمالى المسدد: ${money(ledger.totalCredit)}<br/>
    الرصيد الحالى المستحق على العميل: ${money(ledger.balance)}
  </div>`;

  printHtml(
    `كشف حساب — ${party.name}`,
    `<h1>كشف حساب عميل</h1>${info}${table}${summary}
     <div class="sig"><div>المحاسب</div><div>مدير الحسابات</div><div>العميل</div></div>`,
  );
}
