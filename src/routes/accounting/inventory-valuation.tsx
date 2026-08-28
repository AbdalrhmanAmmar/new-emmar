import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccInventoryValuationPage";

export const Route = createFileRoute("/accounting/inventory-valuation")({
  head: () => ({
    meta: [
      { title: "تقييم المخزون | موديول الحسابات" },
      { name: "description", content: "تقييم المخزون — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "تقييم المخزون | موديول الحسابات" },
      { property: "og:description", content: "تقييم المخزون — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
