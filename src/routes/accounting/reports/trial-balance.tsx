import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/reports/AccTrialBalancePage";

export const Route = createFileRoute("/accounting/reports/trial-balance")({
  head: () => ({
    meta: [
      { title: "ميزان المراجعة | موديول الحسابات" },
      { name: "description", content: "ميزان المراجعة — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "ميزان المراجعة | موديول الحسابات" },
      { property: "og:description", content: "ميزان المراجعة — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
