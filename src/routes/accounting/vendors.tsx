import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccVendorsPage";

export const Route = createFileRoute("/accounting/vendors")({
  head: () => ({
    meta: [
      { title: "الموردون | موديول الحسابات" },
      { name: "description", content: "الموردون — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "الموردون | موديول الحسابات" },
      { property: "og:description", content: "الموردون — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
