import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccCustomersPage";

export const Route = createFileRoute("/accounting/customers")({
  head: () => ({
    meta: [
      { title: "العملاء | موديول الحسابات" },
      { name: "description", content: "العملاء — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "العملاء | موديول الحسابات" },
      { property: "og:description", content: "العملاء — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
