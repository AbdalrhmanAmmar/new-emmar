import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/reports/AccArAgingPage";

export const Route = createFileRoute("/accounting/reports/ar-aging")({
  head: () => ({
    meta: [
      { title: "أعمار الديون | موديول الحسابات" },
      { name: "description", content: "أعمار الديون — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "أعمار الديون | موديول الحسابات" },
      { property: "og:description", content: "أعمار الديون — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
