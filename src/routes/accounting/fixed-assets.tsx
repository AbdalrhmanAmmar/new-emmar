import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccFixedAssetsPage";

export const Route = createFileRoute("/accounting/fixed-assets")({
  head: () => ({
    meta: [
      { title: "الأصول الثابتة والإهلاك | موديول الحسابات" },
      { name: "description", content: "الأصول الثابتة والإهلاك — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "الأصول الثابتة والإهلاك | موديول الحسابات" },
      { property: "og:description", content: "الأصول الثابتة والإهلاك — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
