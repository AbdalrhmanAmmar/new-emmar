import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccProgressBillingPage";

export const Route = createFileRoute("/accounting/progress-billing")({
  head: () => ({
    meta: [
      { title: "مستخلصات المقاولين | موديول الحسابات" },
      { name: "description", content: "مستخلصات المقاولين — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "مستخلصات المقاولين | موديول الحسابات" },
      { property: "og:description", content: "مستخلصات المقاولين — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
