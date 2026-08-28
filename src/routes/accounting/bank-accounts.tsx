import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccBankAccountsPage";

export const Route = createFileRoute("/accounting/bank-accounts")({
  head: () => ({
    meta: [
      { title: "البنوك والصناديق | موديول الحسابات" },
      { name: "description", content: "البنوك والصناديق — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "البنوك والصناديق | موديول الحسابات" },
      { property: "og:description", content: "البنوك والصناديق — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
