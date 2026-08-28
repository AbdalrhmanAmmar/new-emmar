import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccRetentionPage";

export const Route = createFileRoute("/accounting/retention")({
  head: () => ({
    meta: [
      { title: "ضمان حسن التنفيذ | موديول الحسابات" },
      { name: "description", content: "ضمان حسن التنفيذ — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "ضمان حسن التنفيذ | موديول الحسابات" },
      { property: "og:description", content: "ضمان حسن التنفيذ — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
