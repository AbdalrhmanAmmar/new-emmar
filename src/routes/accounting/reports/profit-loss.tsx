import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/reports/AccProfitLossPage";

export const Route = createFileRoute("/accounting/reports/profit-loss")({
  head: () => ({
    meta: [
      { title: "قائمة الدخل | موديول الحسابات" },
      { name: "description", content: "قائمة الدخل — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "قائمة الدخل | موديول الحسابات" },
      { property: "og:description", content: "قائمة الدخل — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
