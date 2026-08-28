import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccBankGuaranteesPage";

export const Route = createFileRoute("/accounting/bank-guarantees")({
  head: () => ({
    meta: [
      { title: "الضمانات البنكية | موديول الحسابات" },
      { name: "description", content: "الضمانات البنكية — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "الضمانات البنكية | موديول الحسابات" },
      { property: "og:description", content: "الضمانات البنكية — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
