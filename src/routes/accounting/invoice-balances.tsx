import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccInvoiceBalancesPage";

export const Route = createFileRoute("/accounting/invoice-balances")({
  head: () => ({
    meta: [
      { title: "أرصدة الفواتير | موديول الحسابات" },
      { name: "description", content: "أرصدة الفواتير — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "أرصدة الفواتير | موديول الحسابات" },
      { property: "og:description", content: "أرصدة الفواتير — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
