import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccFiscalPeriodsPage";

export const Route = createFileRoute("/accounting/fiscal-periods")({
  head: () => ({
    meta: [
      { title: "الفترات المالية والإقفال | موديول الحسابات" },
      { name: "description", content: "الفترات المالية والإقفال — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "الفترات المالية والإقفال | موديول الحسابات" },
      { property: "og:description", content: "الفترات المالية والإقفال — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
