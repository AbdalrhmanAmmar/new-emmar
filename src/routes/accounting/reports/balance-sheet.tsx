import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/reports/AccBalanceSheetPage";

export const Route = createFileRoute("/accounting/reports/balance-sheet")({
  head: () => ({
    meta: [
      { title: "قائمة المركز المالي | موديول الحسابات" },
      { name: "description", content: "قائمة المركز المالي — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "قائمة المركز المالي | موديول الحسابات" },
      { property: "og:description", content: "قائمة المركز المالي — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
