import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccZatcaSubmissionsPage";

export const Route = createFileRoute("/accounting/zatca-submissions")({
  head: () => ({
    meta: [
      { title: "سجل الإرسالات | موديول الحسابات" },
      { name: "description", content: "سجل الإرسالات — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "سجل الإرسالات | موديول الحسابات" },
      { property: "og:description", content: "سجل الإرسالات — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
