import { createFileRoute } from "@tanstack/react-router";

import { PartyBalancesReport } from "@/components/reports/PartyBalancesReport";

export const Route = createFileRoute("/reports/receivables")({
  head: () => ({
    meta: [
      { title: "أرصدة ومديونيات العملاء — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "أرصدة العملاء: الفواتير والتحصيلات والمرتجعات وأعمار المديونية لكل عميل بالجنيه المصري.",
      },
      { property: "og:title", content: "أرصدة ومديونيات العملاء" },
      { property: "og:description", content: "مديونية كل عميل مع أعمار الأرصدة قابلة للطباعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PartyBalancesReport kind="customer" />,
});
