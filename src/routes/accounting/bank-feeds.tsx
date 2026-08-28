import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccBankFeedsPage";

export const Route = createFileRoute("/accounting/bank-feeds")({
  head: () => ({
    meta: [
      { title: "التكاملات البنكية المباشرة | موديول الحسابات" },
      { name: "description", content: "التكاملات البنكية المباشرة — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "التكاملات البنكية المباشرة | موديول الحسابات" },
      { property: "og:description", content: "التكاملات البنكية المباشرة — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
