import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccSalesB2CPage";

export const Route = createFileRoute("/accounting/sales-b2c")({
  head: () => ({
    meta: [
      { title: "فاتورة مبسطة (B2C) | موديول الحسابات" },
      { name: "description", content: "فاتورة مبسطة (B2C) — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "فاتورة مبسطة (B2C) | موديول الحسابات" },
      { property: "og:description", content: "فاتورة مبسطة (B2C) — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
