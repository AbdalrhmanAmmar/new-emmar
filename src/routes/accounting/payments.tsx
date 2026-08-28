import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccPaymentsPage";

export const Route = createFileRoute("/accounting/payments")({
  head: () => ({
    meta: [
      { title: "المدفوعات والتحصيلات | موديول الحسابات" },
      { name: "description", content: "المدفوعات والتحصيلات — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "المدفوعات والتحصيلات | موديول الحسابات" },
      { property: "og:description", content: "المدفوعات والتحصيلات — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
