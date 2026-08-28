import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccAssetDisposalPage";

export const Route = createFileRoute("/accounting/asset-disposal")({
  head: () => ({
    meta: [
      { title: "التصرف في الأصول | موديول الحسابات" },
      { name: "description", content: "التصرف في الأصول — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "التصرف في الأصول | موديول الحسابات" },
      { property: "og:description", content: "التصرف في الأصول — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
