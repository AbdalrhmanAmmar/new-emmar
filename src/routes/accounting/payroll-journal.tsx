import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccPayrollJournalPage";

export const Route = createFileRoute("/accounting/payroll-journal")({
  head: () => ({
    meta: [
      { title: "قيود الرواتب | موديول الحسابات" },
      { name: "description", content: "قيود الرواتب — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "قيود الرواتب | موديول الحسابات" },
      { property: "og:description", content: "قيود الرواتب — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
