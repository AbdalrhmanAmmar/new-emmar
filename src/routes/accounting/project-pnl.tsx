import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccProjectPnlPage";

export const Route = createFileRoute("/accounting/project-pnl")({
  head: () => ({
    meta: [
      { title: "أرباح وخسائر المشاريع | موديول الحسابات" },
      { name: "description", content: "أرباح وخسائر المشاريع — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "أرباح وخسائر المشاريع | موديول الحسابات" },
      { property: "og:description", content: "أرباح وخسائر المشاريع — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
