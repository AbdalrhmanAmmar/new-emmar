import { createFileRoute } from "@tanstack/react-router";

import { ProfitLossReport } from "@/components/reports/ProfitLossReport";

export const Route = createFileRoute("/reports/profit-loss")({
  head: () => ({
    meta: [
      { title: "تقرير الأرباح والخسائر — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content:
          "قائمة أرباح وخسائر: إيرادات المبيعات بعد الخصومات والضريبة مقابل المشتريات وأرصدة المخزون وكل المصروفات بالجنيه المصري.",
      },
      { property: "og:title", content: "تقرير الأرباح والخسائر" },
      { property: "og:description", content: "صافى الأرباح بعد الخصومات والضريبة والمشتريات وكافة المصروفات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfitLossReport,
});
