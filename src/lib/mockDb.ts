/**
 * In-memory demo database for the Accounting module (الوضع الافتراضي).
 * No external backend: data is seeded with realistic Arabic demo rows and
 * persisted in localStorage so edits survive a refresh in the browser.
 */

export type Row = Record<string, any>;
export type Tables = Record<string, Row[]>;

const STORAGE_KEY = "acc_demo_db_v3_feed_eg";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const today = () => new Date().toISOString().slice(0, 10);
const d = (m: number, day: number) => `${new Date().getFullYear()}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const acc = (
  code: string,
  name_ar: string,
  account_type: string,
  is_group = false,
  parent_code: string | null = null,
) => ({ code, name_ar, account_type, is_group, parent_code });

const coaDefs = [
  acc("1", "الأصول", "asset", true),
  acc("11", "الأصول المتداولة", "asset", true, "1"),
  acc("1101", "النقدية بالصندوق", "asset", false, "11"),
  acc("1102", "النقدية بالبنك - البنك الأهلي المصري", "asset", false, "11"),
  acc("1103", "النقدية بالبنك - الأهلي", "asset", false, "11"),
  acc("1201", "العملاء (المدينون)", "asset", false, "11"),
  acc("1202", "ضريبة القيمة المضافة - مدخلات", "asset", false, "11"),
  acc("1301", "المخزون", "asset", false, "11"),
  acc("15", "الأصول الثابتة", "asset", true, "1"),
  acc("1501", "سيارات ومعدات نقل", "asset", false, "15"),
  acc("1502", "أجهزة ومعدات مكتبية", "asset", false, "15"),
  acc("1590", "مجمع الإهلاك", "asset", false, "15"),
  acc("2", "الخصوم", "liability", true),
  acc("2101", "الموردون (الدائنون)", "liability", false, "2"),
  acc("2102", "ضريبة القيمة المضافة - مخرجات", "liability", false, "2"),
  acc("2103", "رواتب مستحقة", "liability", false, "2"),
  acc("2104", "ضمان حسن التنفيذ", "liability", false, "2"),
  acc("3", "حقوق الملكية", "equity", true),
  acc("3101", "رأس المال", "equity", false, "3"),
  acc("3201", "الأرباح المبقاة", "equity", false, "3"),
  acc("4", "الإيرادات", "revenue", true),
  acc("4101", "إيرادات المقاولات", "revenue", false, "4"),
  acc("4102", "إيرادات خدمات", "revenue", false, "4"),
  acc("5", "المصروفات", "expense", true),
  acc("5101", "تكلفة المواد", "expense", false, "5"),
  acc("5102", "أجور ورواتب", "expense", false, "5"),
  acc("5103", "إيجارات", "expense", false, "5"),
  acc("5104", "مصروف الإهلاك", "expense", false, "5"),
  acc("5105", "مصروفات إدارية وعمومية", "expense", false, "5"),
];

function buildCoa() {
  const byCode = new Map<string, Row>();
  const rows: Row[] = coaDefs.map((a) => {
    const row: Row = {
      id: uid(),
      code: a.code,
      name_ar: a.name_ar,
      name_en: null,
      account_type: a.account_type,
      parent_id: null,
      is_group: a.is_group,
      is_active: true,
      currency: "EGP",
      vat_applicable: a.code === "1202" || a.code === "2102",
      notes: null,
    };
    byCode.set(a.code, row);
    return row;
  });
  coaDefs.forEach((a, i) => {
    if (a.parent_code) rows[i].parent_id = byCode.get(a.parent_code)?.id ?? null;
  });
  return rows;
}

function seed(): Tables {
  const coa = buildCoa();
  const idOf = (code: string) => coa.find((a) => a.code === code)?.id ?? null;

  const journalDefs: Array<{
    no: string;
    date: string;
    desc: string;
    status: string;
    source: string;
    lines: Array<[string, string, number, number]>;
  }> = [
    {
      no: "JV-000001",
      date: d(1, 5),
      desc: "إيداع رأس المال بالبنك",
      status: "posted",
      source: "manual",
      lines: [
        ["1102", "إيداع رأس المال", 1500000, 0],
        ["3101", "رأس المال", 0, 1500000],
      ],
    },
    {
      no: "JV-000002",
      date: d(2, 12),
      desc: "فاتورة مبيعات أعلاف - مزارع دواجن",
      status: "posted",
      source: "sales",
      lines: [
        ["1201", "العميل - شركة الدلتا لمزارع الدواجن", 345000, 0],
        ["4101", "إيرادات بيع أعلاف", 0, 300000],
        ["2102", "ضريبة مخرجات 14%", 0, 45000],
      ],
    },
    {
      no: "JV-000003",
      date: d(2, 25),
      desc: "مشتريات خامات أعلاف (ذرة وصويا)",
      status: "posted",
      source: "purchase",
      lines: [
        ["5101", "خامات أعلاف", 120000, 0],
        ["1202", "ضريبة مدخلات 14%", 18000, 0],
        ["2101", "مورد - مصنع الشرق للزيوت", 0, 138000],
      ],
    },
    {
      no: "JV-000004",
      date: d(3, 1),
      desc: "رواتب شهر مارس",
      status: "posted",
      source: "payroll",
      lines: [
        ["5102", "أجور ورواتب", 210000, 0],
        ["2103", "رواتب مستحقة", 0, 210000],
      ],
    },
    {
      no: "JV-000005",
      date: d(3, 20),
      desc: "قيد إهلاك شهري",
      status: "posted",
      source: "assets",
      lines: [
        ["5104", "مصروف إهلاك", 12500, 0],
        ["1590", "مجمع الإهلاك", 0, 12500],
      ],
    },
    {
      no: "JV-000006",
      date: today(),
      desc: "مصروفات إدارية (مسوّدة)",
      status: "draft",
      source: "manual",
      lines: [
        ["5105", "مصروفات مكتبية", 8600, 0],
        ["1101", "الصندوق", 0, 8600],
      ],
    },
  ];

  const acc_journal_entries: Row[] = [];
  const acc_ledger_lines: Row[] = [];
  journalDefs.forEach((j) => {
    const id = uid();
    const total = j.lines.reduce((s, l) => s + l[2], 0);
    acc_journal_entries.push({
      id,
      entry_no: j.no,
      entry_date: j.date,
      description: j.desc,
      status: j.status,
      source: j.source,
      total_debit: total,
      total_credit: total,
      created_at: j.date,
    });
    j.lines.forEach((l, i) => {
      acc_ledger_lines.push({
        id: uid(),
        entry_id: id,
        journal_entry_id: id,
        line_no: i + 1,
        account_id: idOf(l[0]),
        account_code: l[0],
        account_name: coa.find((a) => a.code === l[0])?.name_ar ?? "",
        description: l[1],
        debit: l[2],
        credit: l[3],
        entry_date: j.date,
        entry_no: j.no,
        status: j.status,
        source: j.source,
      });
    });
  });

  const party = (
    code: string,
    name_ar: string,
    vat: string,
    city: string,
    balance: number,
    extra: Row = {},
  ) => ({
    id: uid(),
    code,
    name_ar,
    name_en: null,
    vat_number: vat,
    cr_number: "10102" + code.replace(/\D/g, ""),
    email: `${code.toLowerCase()}@example.com.eg`,
    phone: "010" + String(20000000 + Number(code.replace(/\D/g, "")) * 137).slice(0, 8),
    city,
    contact_person: "أ. محمود السيد",

    payment_terms_days: 30,
    credit_limit: 500000,
    opening_balance: balance,
    opening_date: d(1, 1),
    category: null,
    gl_account_code: null,
    status: "active",
    notes: null,
    ...extra,
  });

  const invDefs = [
    ["INV-2001", "شركة الدلتا لمزارع الدواجن", "512-345-678", 300000, "b2b", "posted", d(2, 12)],
    ["INV-2002", "مزارع النيل للألبان", "478-902-116", 82000, "b2b", "posted", d(3, 4)],
    ["INV-2003", "عميل نقدي", "", 4300, "b2c", "posted", d(3, 18)],
    ["INV-2004", "شركة مصر للدواجن", "745-220-118", 156000, "b2b", "draft", today()],
  ] as const;

  const acc_sales_invoices: Row[] = [];
  const acc_sales_invoice_lines: Row[] = [];
  invDefs.forEach((v, idx) => {
    const [invoice_number, buyer_name, buyer_vat_number, subtotal, invoice_type, status, issue_date] = v;
    const id = uid();
    const vat_total = Math.round(subtotal * 0.14 * 100) / 100;
    acc_sales_invoices.push({
      id,
      invoice_number,
      icv: idx + 1,
      buyer_name,
      buyer_vat_number: buyer_vat_number || null,
      invoice_type,
      subtotal,
      vat_total,
      total: subtotal + vat_total,
      paid_amount: status === "posted" ? subtotal : 0,
      balance: status === "posted" ? vat_total : subtotal + vat_total,
      currency: "EGP",
      device_id: null,
      status,
      issue_date,
      due_date: issue_date,
      notes: null,
    });
    acc_sales_invoice_lines.push({
      id: uid(),
      invoice_id: id,
      line_no: 1,
      description: "أعمال إنشائية على المستخلص",
      quantity: 1,
      unit_price: subtotal,
      vat_rate: 14,
      vat_amount: vat_total,
      line_total: subtotal + vat_total,
    });
  });

  return {
    acc_chart_of_accounts: coa,
    acc_company_profile: [
      {
        id: uid(),
        legal_name_ar: "شركة الإنشاءات المتقدمة للمقاولات",
        legal_name_en: "Advanced Construction Co.",
        vat_number: "512-345-678",
        cr_number: "1010123456",
        short_address: "RRRD2929",
        building_number: "2929",
        street: "طريق الملك فهد",
        district: "العليا",
        city: "القاهرة",
        postal_code: "12211",
        additional_number: "8228",
        country_code: "SA",
        phone: "0112345678",
        email: "finance@advanced-co.sa",
        is_group_vat: false,
      },
    ],
    acc_journal_entries,
    acc_ledger_lines,
    acc_customers: [
      party("C-001", "شركة الدلتا لمزارع الدواجن", "512-345-678", "القاهرة", 120000, { customer_type: "company" }),
      party("C-002", "مزارع النيل للألبان", "478-902-116", "الإسكندرية", 42000, { customer_type: "company" }),
      party("C-003", "جمعية منتجي الدواجن", "633-118-540", "القاهرة", 0, { customer_type: "government" }),
      party("C-004", "محمد عبد الرحمن", "", "طنطا", 3500, { customer_type: "individual" }),
    ],
    acc_vendors: [
      party("V-001", "مصنع الشرق لاستخلاص الزيوت (كسب صويا)", "380-664-201", "القاهرة", 138000, {
        vendor_type: "company",
        bank_name: "البنك الأهلي المصري",
        bank_account: "1234567890",
        iban: "EG380003000123456789012345",
      }),
      party("V-002", "الوادي لتجارة الذرة الصفراء", "291-773-908", "الإسكندرية", 64000, { vendor_type: "company" }),
      party("V-003", "النقل السريع للشحن", "845-110-332", "القاهرة", 12000, { vendor_type: "company" }),
    ],
    acc_bank_accounts: [
      {
        id: uid(),
        code: "BNK-001",
        name_ar: "البنك الأهلي المصري - الحساب الجاري",
        name_en: "Alrajhi current",
        account_type: "bank",
        bank_name: "مصرف البنك الأهلي المصري",
        account_number: "1234567890",
        iban: "EG380003000123456789012345",
        swift: "NBEGEGCX",
        currency: "EGP",
        opening_balance: 1500000,
        opening_date: d(1, 1),
        gl_account_code: "1102",
        status: "active",
        notes: null,
      },
      {
        id: uid(),
        code: "BNK-002",
        name_ar: "الأهلي - حساب المشاريع",
        name_en: "NCB projects",
        account_type: "bank",
        bank_name: "البنك الأهلي",
        account_number: "9988776655",
        iban: "EG440002000765432109876543",
        swift: "NCBKSAJE",
        currency: "EGP",
        opening_balance: 380000,
        opening_date: d(1, 1),
        gl_account_code: "1103",
        status: "active",
        notes: null,
      },
      {
        id: uid(),
        code: "CSH-001",
        name_ar: "الصندوق الرئيسي",
        account_type: "cash",
        currency: "EGP",
        opening_balance: 45000,
        opening_date: d(1, 1),
        gl_account_code: "1101",
        status: "active",
        notes: null,
      },
    ],
    acc_bank_transactions: [
      {
        id: uid(),
        bank_account_id: null,
        txn_date: d(3, 2),
        description: "تحويل من عميل - شركة الدلتا لمزارع الدواجن",
        reference_no: "TRF-88213",
        amount: 200000,
        direction: "inbound",
        status: "unmatched",
        matched_entry_id: null,
      },
      {
        id: uid(),
        bank_account_id: null,
        txn_date: d(3, 9),
        description: "سداد مورد - مصنع الشرق للزيوت",
        reference_no: "TRF-88240",
        amount: 138000,
        direction: "outbound",
        status: "matched",
        matched_entry_id: null,
      },
    ],
    acc_payments: [
      {
        id: uid(),
        payment_no: "PMT-000001",
        payment_date: d(3, 2),
        direction: "inbound",
        method: "bank_transfer",
        status: "posted",
        party_name: "شركة الدلتا لمزارع الدواجن",
        amount: 200000,
        currency: "EGP",
        reference_no: "TRF-88213",
        notes: null,
      },
      {
        id: uid(),
        payment_no: "PMT-000002",
        payment_date: d(3, 9),
        direction: "outbound",
        method: "bank_transfer",
        status: "posted",
        party_name: "مصنع الشرق لاستخلاص الزيوت (كسب صويا)",
        amount: 138000,
        currency: "EGP",
        reference_no: "TRF-88240",
        notes: null,
      },
      {
        id: uid(),
        payment_no: "PMT-000003",
        payment_date: today(),
        direction: "inbound",
        method: "cash",
        status: "draft",
        party_name: "محمد عبد الرحمن",
        amount: 3500,
        currency: "EGP",
        reference_no: null,
        notes: "تحصيل نقدي",
      },
    ],
    acc_sales_invoices,
    acc_sales_invoice_lines,
    acc_credit_debit_notes: [
      {
        id: uid(),
        note_number: "CN-0001",
        note_type: "credit",
        issue_date: d(3, 12),
        buyer_name: "مزارع النيل للألبان",
        original_invoice_number: "INV-2002",
        reason: "خصم كمية",
        subtotal: 5000,
        vat_total: 750,
        total: 5750,
        status: "posted",
      },
    ],
    acc_fixed_assets: [
      {
        id: uid(),
        code: "FA-001",
        name_ar: "حفارة كاتربيلر 320",
        category: "معدات ثقيلة",
        acquisition_date: d(1, 15),
        acquisition_cost: 850000,
        salvage_value: 85000,
        useful_life_months: 120,
        depreciation_method: "straight",
        declining_rate: null,
        location: "مشروع القاهرة",
        serial_number: "CAT320-99182",
        supplier: "الزاهد للمعدات",
        status: "in_use",
        accumulated_depreciation: 63750,
        last_depreciation_date: d(3, 20),
        disposal_date: null,
        disposal_value: null,
        notes: null,
      },
      {
        id: uid(),
        code: "FA-002",
        name_ar: "سيارة نقل ايسوزو",
        category: "سيارات",
        acquisition_date: d(2, 1),
        acquisition_cost: 165000,
        salvage_value: 15000,
        useful_life_months: 60,
        depreciation_method: "straight",
        declining_rate: null,
        location: "الإدارة",
        serial_number: "ISZ-2231",
        supplier: "معرض الجزيرة",
        status: "in_use",
        accumulated_depreciation: 12500,
        last_depreciation_date: d(3, 20),
        disposal_date: null,
        disposal_value: null,
        notes: null,
      },
      {
        id: uid(),
        code: "FA-003",
        name_ar: "أجهزة حاسب مكتبية",
        category: "أجهزة",
        acquisition_date: d(1, 20),
        acquisition_cost: 48000,
        salvage_value: 3000,
        useful_life_months: 36,
        depreciation_method: "declining",
        declining_rate: 25,
        location: "الإدارة",
        serial_number: null,
        supplier: "مكتبة جرير",
        status: "in_use",
        accumulated_depreciation: 9000,
        last_depreciation_date: d(3, 20),
        disposal_date: null,
        disposal_value: null,
        notes: null,
      },
    ],
    acc_depreciation_entries: [
      {
        id: uid(),
        asset_id: null,
        period: d(3, 1),
        amount: 12500,
        method: "straight",
        posted: true,
        entry_no: "JV-000005",
      },
    ],
    acc_asset_disposals: [],
    acc_fiscal_periods: [
      { id: uid(), name: `يناير ${new Date().getFullYear()}`, start_date: d(1, 1), end_date: d(1, 31), status: "closed" },
      { id: uid(), name: `فبراير ${new Date().getFullYear()}`, start_date: d(2, 1), end_date: d(2, 28), status: "closed" },
      { id: uid(), name: `مارس ${new Date().getFullYear()}`, start_date: d(3, 1), end_date: d(3, 31), status: "open" },
    ],
    acc_year_end_closings: [],
    acc_period_closing: [],
    acc_currencies: [
      { id: uid(), code: "EGP", name: "جنيه مصري", symbol: "ج.م", decimals: 2, is_base: true, is_active: true },
      { id: uid(), code: "USD", name: "دولار أمريكي", symbol: "$", decimals: 2, is_base: false, is_active: true },
      { id: uid(), code: "EUR", name: "يورو", symbol: "€", decimals: 2, is_base: false, is_active: true },
      { id: uid(), code: "AED", name: "درهم إماراتي", symbol: "د.إ", decimals: 2, is_base: false, is_active: true },
    ],
    acc_fx_rates: [
      { id: uid(), rate_date: today(), from_currency: "USD", to_currency: "EGP", rate: 48.50, source: "CBE", notes: null },
      { id: uid(), rate_date: today(), from_currency: "EUR", to_currency: "EGP", rate: 52.30, source: "CBE", notes: null },
      { id: uid(), rate_date: today(), from_currency: "AED", to_currency: "EGP", rate: 13.20, source: "CBE", notes: null },
    ],
    acc_cost_centers: [
      { id: uid(), code: "CC-100", name_ar: "الإدارة العامة", parent_id: null, is_active: true, notes: null },
      { id: uid(), code: "CC-200", name_ar: "مشروع القاهرة", parent_id: null, is_active: true, notes: null },
      { id: uid(), code: "CC-300", name_ar: "مشروع الإسكندرية", parent_id: null, is_active: true, notes: null },
    ],
    acc_entities: [
      { id: uid(), code: "E-01", name_ar: "الشركة الأم", currency: "EGP", ownership_pct: 100, is_active: true },
      { id: uid(), code: "E-02", name_ar: "فرع الإسكندرية", currency: "EGP", ownership_pct: 100, is_active: true },
    ],
    acc_consolidation_balances: [],
    acc_cheques: [
      {
        id: uid(),
        cheque_no: "CHQ-4410",
        direction: "outbound",
        party_name: "مصنع الشرق لاستخلاص الزيوت (كسب صويا)",
        bank_name: "مصرف البنك الأهلي المصري",
        issue_date: d(3, 5),
        due_date: d(4, 5),
        amount: 138000,
        currency: "EGP",
        status: "issued",
        notes: null,
      },
      {
        id: uid(),
        cheque_no: "CHQ-9921",
        direction: "inbound",
        party_name: "شركة الدلتا لمزارع الدواجن",
        bank_name: "البنك الأهلي",
        issue_date: d(3, 10),
        due_date: d(4, 10),
        amount: 45000,
        currency: "EGP",
        status: "deposited",
        notes: null,
      },
    ],
    acc_expense_claims: [
      {
        id: uid(),
        claim_no: "EXP-0001",
        employee_name: "سعد الحربي",
        claim_date: d(3, 8),
        total_amount: 4250,
        status: "approved",
        notes: "مصروفات سفر",
      },
      {
        id: uid(),
        claim_no: "EXP-0002",
        employee_name: "منى القحطاني",
        claim_date: today(),
        total_amount: 1180,
        status: "draft",
        notes: null,
      },
    ],
    acc_expense_claim_lines: [],
    acc_payroll_journals: [
      {
        id: uid(),
        period: d(3, 1),
        gross_salaries: 210000,
        gosi: 18900,
        deductions: 4200,
        net_paid: 186900,
        status: "posted",
        entry_no: "JV-000004",
      },
    ],
    acc_budgets: [
      {
        id: uid(),
        name: `موازنة ${new Date().getFullYear()}`,
        fiscal_year: new Date().getFullYear(),
        cost_center: "CC-200",
        status: "approved",
        total_amount: 4500000,
        notes: null,
      },
    ],
    acc_budget_lines: [
      { id: uid(), budget_id: null, account_code: "5101", account_name: "تكلفة المواد", amount: 1800000, actual: 120000 },
      { id: uid(), budget_id: null, account_code: "5102", account_name: "أجور ورواتب", amount: 2200000, actual: 210000 },
      { id: uid(), budget_id: null, account_code: "5105", account_name: "مصروفات عمومية", amount: 500000, actual: 8600 },
    ],
    acc_progress_billings: [
      {
        id: uid(),
        billing_no: "PB-0001",
        project_name: "مشروع القاهرة - المرحلة الأولى",
        billing_date: d(3, 15),
        contract_value: 12000000,
        completed_pct: 34,
        current_value: 4080000,
        previous_value: 2600000,
        retention_pct: 10,
        retention_amount: 148000,
        net_amount: 1332000,
        status: "approved",
      },
    ],
    acc_progress_billing_lines: [],
    acc_retention_entries: [
      {
        id: uid(),
        project_name: "مشروع القاهرة - المرحلة الأولى",
        billing_no: "PB-0001",
        retention_amount: 148000,
        released_amount: 0,
        balance: 148000,
        due_date: d(12, 31),
        status: "held",
      },
    ],
    acc_advance_payments: [
      {
        id: uid(),
        project_name: "مشروع الإسكندرية",
        payment_no: "ADV-0001",
        payment_date: d(2, 20),
        amount: 900000,
        recovered_amount: 180000,
        balance: 720000,
        recovery_pct: 20,
        status: "active",
      },
    ],
    acc_advance_recoveries: [],
    acc_wip_poc: [
      {
        id: uid(),
        project_name: "مشروع القاهرة - المرحلة الأولى",
        contract_value: 12000000,
        cost_to_date: 3900000,
        estimated_total_cost: 10200000,
        completed_pct: 38.24,
        revenue_recognized: 4588000,
        billed_to_date: 4080000,
        wip_amount: 508000,
        period: d(3, 1),
      },
    ],
    acc_project_pnl: [],
    acc_bank_guarantees: [
      {
        id: uid(),
        guarantee_no: "LG-77120",
        guarantee_type: "performance",
        bank_name: "مصرف البنك الأهلي المصري",
        beneficiary: "جمعية منتجي الدواجن",
        amount: 600000,
        issue_date: d(1, 10),
        expiry_date: d(12, 31),
        status: "active",
        notes: null,
      },
    ],
    acc_inventory_valuation: [
      {
        id: uid(),
        item_code: "MAT-001",
        item_name: "أسمنت مقاوم (طن)",
        warehouse: "مستودع القاهرة",
        quantity: 1200,
        unit_cost: 320,
        total_value: 384000,
        method: "weighted_average",
        as_of_date: today(),
      },
      {
        id: uid(),
        item_code: "MAT-002",
        item_name: "حديد تسليح 16مم (طن)",
        warehouse: "مستودع القاهرة",
        quantity: 85,
        unit_cost: 2750,
        total_value: 233750,
        method: "weighted_average",
        as_of_date: today(),
      },
    ],
    acc_pos_devices: [
      {
        id: uid(),
        name: "كاشير الفرع الرئيسي",
        device_name: "كاشير الفرع الرئيسي",
        serial_number: "POS-001-RYD",
        device_serial: "POS-001-RYD",
        device_uuid: uid(),
        branch: "القاهرة",
        location: "القاهرة",
        cashier_name: "أحمد المصري",
        environment: "production",
        csid_status: "onboarded",
        status: "onboarded",
        is_active: true,
        icv: 3,
        csid: "DEMO-CSID-001",
        last_submission_at: d(3, 18),
        notes: null,
      },
      {
        id: uid(),
        name: "كاشير فرع الإسكندرية",
        device_name: "كاشير فرع الإسكندرية",
        serial_number: "POS-002-JED",
        device_serial: "POS-002-JED",
        device_uuid: uid(),
        branch: "الإسكندرية",
        location: "الإسكندرية",
        cashier_name: "سالم العتيبي",
        environment: "sandbox",
        csid_status: "pending",
        status: "pending",
        is_active: true,
        icv: 0,
        csid: null,
        last_submission_at: null,
        notes: null,
      },
    ],
    acc_zatca_submissions: [
      {
        id: uid(),
        invoice_number: "INV-2001",
        invoice_type: "b2b",
        submission_type: "clearance",
        status: "cleared",
        submitted_at: d(2, 12),
        response_code: "200",
        warnings: null,
        errors: null,
        uuid: uid(),
      },
      {
        id: uid(),
        invoice_number: "INV-2003",
        invoice_type: "b2c",
        submission_type: "reporting",
        status: "reported",
        submitted_at: d(3, 18),
        response_code: "202",
        warnings: "قيمة الضريبة مقربة",
        errors: null,
        uuid: uid(),
      },
    ],
    acc_bank_feeds: [
      {
        id: uid(),
        provider: "Alrajhi API",
        bank_name: "مصرف البنك الأهلي المصري",
        status: "connected",
        last_sync_at: d(3, 20),
        notes: "مزامنة يومية 02:00",
      },
    ],
  };
}

let cache: Tables | null = null;

function load(): Tables {
  if (cache) return cache;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        cache = JSON.parse(raw) as Tables;
        return cache;
      }
    } catch {
      /* ignore corrupted cache */
    }
  }
  cache = seed();
  persist();
  return cache;
}

function persist() {
  if (typeof window === "undefined" || !cache) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* quota — demo data stays in memory */
  }
}

export function resetDb() {
  cache = seed();
  persist();
}

export function getTable(name: string): Row[] {
  const db = load();
  const view = buildView(name, db);
  if (view) return view;
  if (!db[name]) db[name] = [];
  return db[name];
}

export function writeTable(name: string, rows: Row[]) {
  const db = load();
  db[name] = rows;
  persist();
}

const num = (v: any) => Number(v ?? 0);

function buildView(name: string, db: Tables): Row[] | null {
  const coa = db["acc_chart_of_accounts"] ?? [];
  const lines = (db["acc_ledger_lines"] ?? []).filter((l) => l.status === "posted");
  const invoices = db["acc_sales_invoices"] ?? [];

  const trial = () => {
    const map = new Map<string, Row>();
    lines.forEach((l) => {
      const account = coa.find((a) => a.id === l.account_id || a.code === l.account_code);
      const code = account?.code ?? l.account_code ?? "—";
      if (!map.has(code)) {
        map.set(code, {
          account_id: account?.id ?? code,
          account_code: code,
          account_name: account?.name_ar ?? l.account_name ?? code,
          account_type: account?.account_type ?? "asset",
          total_debit: 0,
          total_credit: 0,
          balance: 0,
        });
      }
      const row = map.get(code)!;
      row.total_debit += num(l.debit);
      row.total_credit += num(l.credit);
      row.balance = row.total_debit - row.total_credit;
    });
    return [...map.values()];
  };

  switch (name) {
    case "v_acc_trial_balance":
      return trial();
    case "v_acc_general_ledger": {
      const running = new Map<string, number>();
      return [...lines]
        .sort((a, b) => String(a.entry_date).localeCompare(String(b.entry_date)))
        .map((l) => {
          const account = coa.find((a) => a.id === l.account_id || a.code === l.account_code);
          const code = account?.code ?? l.account_code ?? "—";
          const prev = running.get(code) ?? 0;
          const balance = prev + num(l.debit) - num(l.credit);
          running.set(code, balance);
          return {
            ...l,
            line_id: l.id,
            account_code: code,
            account_name: account?.name_ar ?? l.account_name,
            account_name_ar: account?.name_ar ?? l.account_name,
            account_type: account?.account_type ?? null,
            line_description: l.description ?? null,
            running_balance: balance,
          };
        });
    }

    case "v_acc_profit_loss":
      return trial()
        .filter((r) => r.account_type === "revenue" || r.account_type === "expense")
        .map((r) => ({
          ...r,
          amount:
            r.account_type === "revenue" ? r.total_credit - r.total_debit : r.total_debit - r.total_credit,
          section: r.account_type === "revenue" ? "الإيرادات" : "المصروفات",
        }));
    case "v_acc_balance_sheet":
      return trial()
        .filter((r) => ["asset", "liability", "equity"].includes(r.account_type))
        .map((r) => ({
          ...r,
          amount: r.account_type === "asset" ? r.balance : -r.balance,
          section:
            r.account_type === "asset" ? "الأصول" : r.account_type === "liability" ? "الخصوم" : "حقوق الملكية",
        }));
    case "v_acc_vat_report":
      return [
        {
          period: `${new Date().getFullYear()}-Q1`,
          taxable_sales: invoices.reduce((s, i) => s + num(i.subtotal), 0),
          output_vat: invoices.reduce((s, i) => s + num(i.vat_total), 0),
          taxable_purchases: 120000,
          input_vat: 18000,
          net_vat: invoices.reduce((s, i) => s + num(i.vat_total), 0) - 18000,
        },
      ];
    case "v_acc_invoice_balances":
      return invoices.map((i) => ({
        invoice_number: i.invoice_number,
        buyer_name: i.buyer_name,
        issue_date: i.issue_date,
        total: num(i.total),
        paid_amount: num(i.paid_amount),
        balance: num(i.balance),
        status: i.status,
      }));
    case "v_acc_ar_aging": {
      const buckets = (i: Row) => {
        const days = Math.floor((Date.now() - new Date(i.issue_date).getTime()) / 86400000);
        const bal = num(i.balance);
        return {
          customer_name: i.buyer_name,
          invoice_number: i.invoice_number,
          issue_date: i.issue_date,
          balance: bal,
          days_outstanding: days,
          bucket_current: days <= 30 ? bal : 0,
          bucket_30: days > 30 && days <= 60 ? bal : 0,
          bucket_60: days > 60 && days <= 90 ? bal : 0,
          bucket_90: days > 90 ? bal : 0,
        };
      };
      return invoices.filter((i) => num(i.balance) > 0).map(buckets);
    }
    default:
      return null;
  }
}

/**
 * Business unique keys — تمنع تكرار البيانات أو تداخلها.
 * Any insert/upsert/update that would create a second row with the same value
 * for one of these keys is rejected by the data client.
 */
export const UNIQUE_KEYS: Record<string, string[][]> = {
  acc_chart_of_accounts: [["code"]],
  acc_customers: [["code"], ["tax_number"]],
  acc_vendors: [["code"], ["tax_number"]],
  acc_bank_accounts: [["account_number"]],
  acc_pos_devices: [["device_uuid"], ["serial_number"]],
  acc_journal_entries: [["journal_no"]],
  acc_sales_invoices: [["invoice_number"]],
  acc_credit_debit_notes: [["note_number"]],
  acc_payments: [["payment_no"]],
  acc_cheques: [["cheque_no", "bank_account_id"]],
  acc_fixed_assets: [["asset_code"]],
  acc_cost_centers: [["code"]],
  acc_currencies: [["code"]],
  acc_fiscal_periods: [["name"]],
  acc_budgets: [["fiscal_year", "account_id", "cost_center_id"]],
  acc_expense_claims: [["claim_no"]],
  acc_bank_guarantees: [["guarantee_no"]],
};

const keyValue = (row: Row, cols: string[]) =>
  cols.map((c) => String(row[c] ?? "").trim().toLowerCase()).join("§");

/** Returns an Arabic error message when `candidate` duplicates an existing row. */
export function findDuplicate(table: string, candidate: Row, existing: Row[]): string | null {
  const keys = UNIQUE_KEYS[table];
  if (!keys) return null;
  for (const cols of keys) {
    if (cols.some((c) => candidate[c] === undefined || candidate[c] === null || candidate[c] === "")) continue;
    const val = keyValue(candidate, cols);
    const clash = existing.find((r) => r.id !== candidate.id && keyValue(r, cols) === val);
    if (clash) {
      return `لا يمكن الحفظ: يوجد سجل بنفس (${cols.join(" + ")}) = ${cols
        .map((c) => candidate[c])
        .join(" + ")} — تم منع التكرار.`;
    }
  }
  return null;
}
