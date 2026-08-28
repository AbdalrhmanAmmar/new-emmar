import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccPeriodClosingPage";

export const Route = createFileRoute("/accounting/period-closing")({
  head: () => ({
    meta: [
      { title: "إقفال نهاية الفترة | موديول الحسابات" },
      { name: "description", content: "إقفال نهاية الفترة — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "إقفال نهاية الفترة | موديول الحسابات" },
      { property: "og:description", content: "إقفال نهاية الفترة — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
