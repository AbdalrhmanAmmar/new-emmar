import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccCompanyProfilePage";

export const Route = createFileRoute("/accounting/company-profile")({
  head: () => ({
    meta: [
      { title: "بيانات المنشأة | موديول الحسابات" },
      { name: "description", content: "بيانات المنشأة — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "بيانات المنشأة | موديول الحسابات" },
      { property: "og:description", content: "بيانات المنشأة — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
