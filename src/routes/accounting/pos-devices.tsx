import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccPosDevicesPage";

export const Route = createFileRoute("/accounting/pos-devices")({
  head: () => ({
    meta: [
      { title: "أجهزة نقاط البيع | موديول الحسابات" },
      { name: "description", content: "أجهزة نقاط البيع — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "أجهزة نقاط البيع | موديول الحسابات" },
      { property: "og:description", content: "أجهزة نقاط البيع — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
