import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccSalesB2BPage";

export const Route = createFileRoute("/accounting/sales-b2b")({
  head: () => ({
    meta: [
      { title: "فاتورة ضريبية (B2B) | موديول الحسابات" },
      { name: "description", content: "فاتورة ضريبية (B2B) — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "فاتورة ضريبية (B2B) | موديول الحسابات" },
      { property: "og:description", content: "فاتورة ضريبية (B2B) — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
