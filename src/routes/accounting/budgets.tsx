import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccBudgetsPage";

export const Route = createFileRoute("/accounting/budgets")({
  head: () => ({
    meta: [
      { title: "الموازنات التقديرية | موديول الحسابات" },
      { name: "description", content: "الموازنات التقديرية — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "الموازنات التقديرية | موديول الحسابات" },
      { property: "og:description", content: "الموازنات التقديرية — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
