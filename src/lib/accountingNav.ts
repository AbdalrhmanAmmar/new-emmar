/** Navigation map for the accounting module — feed trading company (تجارة الأعلاف). */

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
      { path: "/accounting/customers", label: "العملاء", file: "AccCustomersPage" },
      { path: "/accounting/vendors", label: "الموردون", file: "AccVendorsPage" },
    ],
  },
  {
    title: "الأعلاف والمخزون",
    items: [
      { path: "/accounting/items", label: "أصناف الأعلاف والخامات", file: "AccItemsPage" },
      { path: "/accounting/warehouses", label: "المخازن", file: "AccWarehousesPage" },
      { path: "/accounting/stock-moves", label: "حركة المخزون (وارد/صادر)", file: "AccStockMovesPage" },
      { path: "/accounting/stock-balance", label: "أرصدة المخزون بالأوزان", file: "AccStockBalancePage" },
      { path: "/accounting/inventory-valuation", label: "تقييم المخزون", file: "AccInventoryValuationPage" },
    ],
  },
  {
    title: "دورة المشتريات",
    items: [
      { path: "/accounting/rfqs", label: "1. طلبات عروض الأسعار", file: "AccRfqsPage" },
      { path: "/accounting/purchase-orders", label: "2. أوامر الشراء", file: "AccPurchaseOrdersPage" },
      { path: "/accounting/goods-receipts", label: "3. إذون الاستلام (بالميزان)", file: "AccGoodsReceiptsPage" },
      { path: "/accounting/landed-costs", label: "مصاريف الوصول والنولون", file: "AccLandedCostsPage" },
      { path: "/accounting/vendor-bills", label: "4. فواتير الموردين والسداد", file: "AccVendorBillsPage" },
      { path: "/accounting/purchase-returns", label: "مرتجعات المشتريات", file: "AccPurchaseReturnsPage" },
      { path: "/accounting/purchase-cycle", label: "متابعة دورة المشتريات", file: "AccPurchaseCyclePage" },
    ],
  },
  {
    title: "دورة المبيعات",
    items: [
      { path: "/accounting/sales-quotations", label: "1. عروض أسعار العملاء", file: "AccSalesQuotationsPage" },
      { path: "/accounting/sales-orders", label: "2. أوامر البيع", file: "AccSalesOrdersPage" },
      { path: "/accounting/deliveries", label: "3. إذون التسليم", file: "AccDeliveriesPage" },
      { path: "/accounting/sales-billing", label: "4. الفوترة والتحصيل", file: "AccSalesBillingPage" },
      { path: "/accounting/sales-returns", label: "مرتجعات المبيعات", file: "AccSalesReturnsPage" },
      { path: "/accounting/sales-cycle", label: "متابعة دورة المبيعات", file: "AccSalesCyclePage" },
    ],
  },
  {
    title: "الفوترة السريعة",
    items: [
      { path: "/accounting/sales-b2c", label: "فاتورة نقدية (تجزئة)", file: "AccSalesB2CPage" },
      { path: "/accounting/sales-b2b", label: "فاتورة ضريبية (مزارع/شركات)", file: "AccSalesB2BPage" },
      { path: "/accounting/credit-debit-notes", label: "إشعارات دائنة/مدينة", file: "AccCreditDebitNotesPage" },
      { path: "/accounting/invoice-balances", label: "أرصدة الفواتير", file: "AccInvoiceBalancesPage" },
    ],
  },
  {
    title: "الخزينة والبنوك",
    items: [
      { path: "/accounting/bank-accounts", label: "البنوك والصناديق", file: "AccBankAccountsPage" },
      { path: "/accounting/payments", label: "المدفوعات والتحصيلات", file: "AccPaymentsPage" },
      { path: "/accounting/cheques", label: "الشيكات (صادرة/واردة)", file: "AccChequesPage" },
      { path: "/accounting/bank-reconciliation", label: "التسويات البنكية", file: "AccBankReconciliationPage" },
      { path: "/accounting/bank-feeds", label: "التكاملات البنكية", file: "AccBankFeedsPage" },
    ],
  },
  {
    title: "القيود والدفاتر",
    items: [
      { path: "/accounting/journal-entries", label: "القيود اليومية", file: "AccJournalEntriesPage" },
      { path: "/accounting/general-ledger", label: "دفتر الأستاذ", file: "AccGeneralLedgerPage" },
      { path: "/accounting/expense-claims", label: "مطالبات المصروفات", file: "AccExpenseClaimsPage" },
      { path: "/accounting/payroll-journal", label: "قيود الرواتب", file: "AccPayrollJournalPage" },
    ],
  },
  {
    title: "الأصول",
    items: [
      { path: "/accounting/fixed-assets", label: "الأصول الثابتة والإهلاك", file: "AccFixedAssetsPage" },
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
      { path: "/accounting/reports/trial-balance", label: "ميزان المراجعة", file: "reports/AccTrialBalancePage" },
      { path: "/accounting/reports/profit-loss", label: "قائمة الدخل", file: "reports/AccProfitLossPage" },
      { path: "/accounting/reports/balance-sheet", label: "قائمة المركز المالي", file: "reports/AccBalanceSheetPage" },
      { path: "/accounting/reports/vat", label: "ضريبة القيمة المضافة (14%)", file: "reports/AccVatReportPage" },
      { path: "/accounting/reports/ar-aging", label: "أعمار الديون", file: "reports/AccArAgingPage" },
      { path: "/accounting/fiscal-periods", label: "الفترات المالية والإقفال", file: "AccFiscalPeriodsPage" },
      { path: "/accounting/period-closing", label: "إقفال نهاية الفترة", file: "AccPeriodClosingPage" },
    ],
  },
  {
    title: "الإعدادات المتقدمة",
    items: [
      { path: "/accounting/cost-centers", label: "مراكز التكلفة", file: "AccCostCentersPage" },
      { path: "/accounting/currencies", label: "العملات وأسعار الصرف", file: "AccCurrenciesPage" },
      { path: "/accounting/consolidation", label: "توحيد القوائم المالية", file: "AccConsolidationPage" },
      { path: "/accounting/doc-settings", label: "إعدادات دورتي الشراء والبيع", file: "AccDocSettingsPage" },
    ],
  },
];

export const accountingItems: NavItem[] = accountingNav.flatMap((g) => g.items);
