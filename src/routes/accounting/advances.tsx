import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccAdvancePaymentsPage";

export const Route = createFileRoute("/accounting/advances")({
  head: () => ({
    meta: [
      { title: "الدفعات المقدمة | موديول الحسابات" },
      { name: "description", content: "الدفعات المقدمة — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "الدفعات المقدمة | موديول الحسابات" },
      { property: "og:description", content: "الدفعات المقدمة — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
