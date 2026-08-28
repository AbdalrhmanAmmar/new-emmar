import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccChequesPage";

export const Route = createFileRoute("/accounting/cheques")({
  head: () => ({
    meta: [
      { title: "الشيكات (صادرة/واردة) | موديول الحسابات" },
      { name: "description", content: "الشيكات (صادرة/واردة) — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "الشيكات (صادرة/واردة) | موديول الحسابات" },
      { property: "og:description", content: "الشيكات (صادرة/واردة) — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
