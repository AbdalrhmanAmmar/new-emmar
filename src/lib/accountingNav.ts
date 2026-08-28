/** Navigation map for the accounting module (module الحسابات). */

export type NavItem = {
  path: string;
  label: string;
  file: string;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const accountingNav: NavGroup[] = [
  {
    title: "الإعداد",
    items: [
      { path: "/accounting/company-profile", label: "بيانات المنشأة", file: "AccCompanyProfilePage" },
      { path: "/accounting/chart-of-accounts", label: "دليل الحسابات", file: "AccChartOfAccountsPage" },
      { path: "/accounting/pos-devices", label: "أجهزة نقاط البيع", file: "AccPosDevicesPage" },
      { path: "/accounting/customers", label: "العملاء", file: "AccCustomersPage" },
      { path: "/accounting/vendors", label: "الموردون", file: "AccVendorsPage" },
    ],
  },
  {
    title: "الخزينة والبنوك",
    items: [
      { path: "/accounting/bank-accounts", label: "البنوك والصناديق", file: "AccBankAccountsPage" },
      { path: "/accounting/bank-reconciliation", label: "التسويات البنكية", file: "AccBankReconciliationPage" },
    ],
  },
  {
    title: "ZATCA",
    items: [
      { path: "/accounting/zatca-onboarding", label: "ربط ZATCA", file: "AccZatcaOnboardingPage" },
      { path: "/accounting/zatca-submissions", label: "سجل الإرسالات", file: "AccZatcaSubmissionsPage" },
    ],
  },
  {
    title: "المبيعات والفوترة",
    items: [
      { path: "/accounting/sales-b2c", label: "فاتورة مبسطة (B2C)", file: "AccSalesB2CPage" },
      { path: "/accounting/sales-b2b", label: "فاتورة ضريبية (B2B)", file: "AccSalesB2BPage" },
      { path: "/accounting/credit-debit-notes", label: "إشعارات دائنة/مدينة", file: "AccCreditDebitNotesPage" },
    ],
  },
  {
    title: "القيود والدفاتر",
    items: [
      { path: "/accounting/journal-entries", label: "القيود اليومية", file: "AccJournalEntriesPage" },
      { path: "/accounting/general-ledger", label: "دفتر الأستاذ", file: "AccGeneralLedgerPage" },
      { path: "/accounting/payments", label: "المدفوعات والتحصيلات", file: "AccPaymentsPage" },
      { path: "/accounting/expense-claims", label: "مطالبات المصروفات", file: "AccExpenseClaimsPage" },
      { path: "/accounting/cheques", label: "الشيكات (صادرة/واردة)", file: "AccChequesPage" },
      { path: "/accounting/payroll-journal", label: "قيود الرواتب", file: "AccPayrollJournalPage" },
    ],
  },
  {
    title: "المقاولات",
    items: [
      { path: "/accounting/progress-billing", label: "مستخلصات المقاولين", file: "AccProgressBillingPage" },
      { path: "/accounting/retention", label: "ضمان حسن التنفيذ", file: "AccRetentionPage" },
      { path: "/accounting/advances", label: "الدفعات المقدمة", file: "AccAdvancePaymentsPage" },
      { path: "/accounting/wip-poc", label: "WIP / نسبة الإنجاز", file: "AccWipPocPage" },
      { path: "/accounting/project-pnl", label: "أرباح وخسائر المشاريع", file: "AccProjectPnlPage" },
      { path: "/accounting/bank-guarantees", label: "الضمانات البنكية", file: "AccBankGuaranteesPage" },
    ],
  },
  {
    title: "المخزون والأصول",
    items: [
      { path: "/accounting/fixed-assets", label: "الأصول الثابتة والإهلاك", file: "AccFixedAssetsPage" },
      { path: "/accounting/inventory-valuation", label: "تقييم المخزون", file: "AccInventoryValuationPage" },
      { path: "/accounting/asset-disposal", label: "التصرف في الأصول", file: "AccAssetDisposalPage" },
    ],
  },
  {
    title: "الموازنات والتخطيط",
    items: [{ path: "/accounting/budgets", label: "الموازنات التقديرية", file: "AccBudgetsPage" }],
  },
  {
    title: "التقارير والإقفال",
    items: [
      { path: "/accounting/invoice-balances", label: "أرصدة الفواتير", file: "AccInvoiceBalancesPage" },
      { path: "/accounting/fiscal-periods", label: "الفترات المالية والإقفال", file: "AccFiscalPeriodsPage" },
      { path: "/accounting/period-closing", label: "إقفال نهاية الفترة", file: "AccPeriodClosingPage" },
      { path: "/accounting/reports/trial-balance", label: "ميزان المراجعة", file: "reports/AccTrialBalancePage" },
      { path: "/accounting/reports/profit-loss", label: "قائمة الدخل", file: "reports/AccProfitLossPage" },
      { path: "/accounting/reports/balance-sheet", label: "قائمة المركز المالي", file: "reports/AccBalanceSheetPage" },
      { path: "/accounting/reports/vat", label: "ضريبة القيمة المضافة", file: "reports/AccVatReportPage" },
      { path: "/accounting/reports/ar-aging", label: "أعمار الديون", file: "reports/AccArAgingPage" },
    ],
  },
  {
    title: "الإعدادات المتقدمة",
    items: [
      { path: "/accounting/cost-centers", label: "مراكز التكلفة المتقدمة", file: "AccCostCentersPage" },
      { path: "/accounting/currencies", label: "العملات وأسعار الصرف", file: "AccCurrenciesPage" },
      { path: "/accounting/consolidation", label: "توحيد القوائم المالية", file: "AccConsolidationPage" },
      { path: "/accounting/bank-feeds", label: "التكاملات البنكية المباشرة", file: "AccBankFeedsPage" },
    ],
  },
];

export const accountingItems: NavItem[] = accountingNav.flatMap((g) => g.items);
