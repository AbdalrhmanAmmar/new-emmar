import { createFileRoute } from "@tanstack/react-router";

import { SafeBalancesReport } from "@/components/reports/SafeBalancesReport";

export const Route = createFileRoute("/reports/safe-balances")({
  head: () => ({
    meta: [
      { title: "أرصدة الخزائن والبنوك — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "أرصدة الخزائن والحسابات البنكية: الرصيد الافتتاحى والوارد والمنصرف والرصيد الحالى بالجنيه المصري.",
      },
      { property: "og:title", content: "أرصدة الخزائن والبنوك" },
      { property: "og:description", content: "رصيد كل خزنة أو بنك مع حركة الفترة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SafeBalancesReport,
});
