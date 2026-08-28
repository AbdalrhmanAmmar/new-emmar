import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccConsolidationPage";

export const Route = createFileRoute("/accounting/consolidation")({
  head: () => ({
    meta: [
      { title: "توحيد القوائم المالية | موديول الحسابات" },
      { name: "description", content: "توحيد القوائم المالية — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "توحيد القوائم المالية | موديول الحسابات" },
      { property: "og:description", content: "توحيد القوائم المالية — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
