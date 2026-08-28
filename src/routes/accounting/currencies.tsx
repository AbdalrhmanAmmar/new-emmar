import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccCurrenciesPage";

export const Route = createFileRoute("/accounting/currencies")({
  head: () => ({
    meta: [
      { title: "العملات وأسعار الصرف | موديول الحسابات" },
      { name: "description", content: "العملات وأسعار الصرف — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "العملات وأسعار الصرف | موديول الحسابات" },
      { property: "og:description", content: "العملات وأسعار الصرف — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
