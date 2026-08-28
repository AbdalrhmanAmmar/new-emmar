import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccGeneralLedgerPage";

export const Route = createFileRoute("/accounting/general-ledger")({
  head: () => ({
    meta: [
      { title: "دفتر الأستاذ | موديول الحسابات" },
      { name: "description", content: "دفتر الأستاذ — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "دفتر الأستاذ | موديول الحسابات" },
      { property: "og:description", content: "دفتر الأستاذ — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
