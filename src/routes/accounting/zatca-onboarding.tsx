import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccZatcaOnboardingPage";

export const Route = createFileRoute("/accounting/zatca-onboarding")({
  head: () => ({
    meta: [
      { title: "ربط ZATCA | موديول الحسابات" },
      { name: "description", content: "ربط ZATCA — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "ربط ZATCA | موديول الحسابات" },
      { property: "og:description", content: "ربط ZATCA — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
