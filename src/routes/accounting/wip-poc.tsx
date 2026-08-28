import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccWipPocPage";

export const Route = createFileRoute("/accounting/wip-poc")({
  head: () => ({
    meta: [
      { title: "WIP / نسبة الإنجاز | موديول الحسابات" },
      { name: "description", content: "WIP / نسبة الإنجاز — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "WIP / نسبة الإنجاز | موديول الحسابات" },
      { property: "og:description", content: "WIP / نسبة الإنجاز — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
