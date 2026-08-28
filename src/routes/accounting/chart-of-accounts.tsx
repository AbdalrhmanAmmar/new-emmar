import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccChartOfAccountsPage";

export const Route = createFileRoute("/accounting/chart-of-accounts")({
  head: () => ({
    meta: [
      { title: "دليل الحسابات | موديول الحسابات" },
      { name: "description", content: "دليل الحسابات — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "دليل الحسابات | موديول الحسابات" },
      { property: "og:description", content: "دليل الحسابات — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
