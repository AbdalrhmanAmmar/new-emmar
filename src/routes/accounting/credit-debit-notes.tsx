import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccCreditDebitNotesPage";

export const Route = createFileRoute("/accounting/credit-debit-notes")({
  head: () => ({
    meta: [
      { title: "إشعارات دائنة/مدينة | موديول الحسابات" },
      { name: "description", content: "إشعارات دائنة/مدينة — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "إشعارات دائنة/مدينة | موديول الحسابات" },
      { property: "og:description", content: "إشعارات دائنة/مدينة — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
