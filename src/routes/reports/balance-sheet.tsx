import { createFileRoute } from "@tanstack/react-router";

import { BalanceSheetReport } from "@/components/reports/BalanceSheetReport";

export const Route = createFileRoute("/reports/balance-sheet")({
  head: () => ({
    meta: [
      { title: "قائمة المركز المالى — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "الميزانية العمومية: الأصول والخصوم وحقوق الملكية حتى تاريخ محدد بالجنيه المصري.",
      },
      { property: "og:title", content: "قائمة المركز المالى" },
      { property: "og:description", content: "الأصول والالتزامات وحقوق الملكية فى تقرير واحد قابل للطباعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BalanceSheetReport,
});
