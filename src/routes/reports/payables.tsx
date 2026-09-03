import { createFileRoute } from "@tanstack/react-router";

import { PartyBalancesReport } from "@/components/reports/PartyBalancesReport";

export const Route = createFileRoute("/reports/payables")({
  head: () => ({
    meta: [
      { title: "أرصدة ومستحقات الموردين — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "أرصدة الموردين: فواتير الشراء والمدفوعات والمرتجعات وأعمار الالتزامات لكل مورد بالجنيه المصري.",
      },
      { property: "og:title", content: "أرصدة ومستحقات الموردين" },
      { property: "og:description", content: "المستحق لكل مورد مع أعمار الالتزامات قابل للطباعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PartyBalancesReport kind="supplier" />,
});
