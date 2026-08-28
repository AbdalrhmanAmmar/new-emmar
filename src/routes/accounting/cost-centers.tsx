import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccCostCentersPage";

export const Route = createFileRoute("/accounting/cost-centers")({
  head: () => ({
    meta: [
      { title: "مراكز التكلفة المتقدمة | موديول الحسابات" },
      { name: "description", content: "مراكز التكلفة المتقدمة — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "مراكز التكلفة المتقدمة | موديول الحسابات" },
      { property: "og:description", content: "مراكز التكلفة المتقدمة — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
