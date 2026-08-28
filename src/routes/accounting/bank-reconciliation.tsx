import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccBankReconciliationPage";

export const Route = createFileRoute("/accounting/bank-reconciliation")({
  head: () => ({
    meta: [
      { title: "التسويات البنكية | موديول الحسابات" },
      { name: "description", content: "التسويات البنكية — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "التسويات البنكية | موديول الحسابات" },
      { property: "og:description", content: "التسويات البنكية — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
