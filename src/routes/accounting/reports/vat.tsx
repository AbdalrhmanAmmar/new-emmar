import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/reports/AccVatReportPage";

export const Route = createFileRoute("/accounting/reports/vat")({
  head: () => ({
    meta: [
      { title: "ضريبة القيمة المضافة | موديول الحسابات" },
      { name: "description", content: "ضريبة القيمة المضافة — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "ضريبة القيمة المضافة | موديول الحسابات" },
      { property: "og:description", content: "ضريبة القيمة المضافة — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
