import { createFileRoute } from "@tanstack/react-router";

import { ExpenseAnalysisReport } from "@/components/reports/ExpenseAnalysisReport";

export const Route = createFileRoute("/reports/expenses-analysis")({
  head: () => ({
    meta: [
      { title: "تحليل المصروفات — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "تحليل المصروفات حسب بند الصرف والنوع: مصروفات عامة ونثريات ورواتب وسلف بالجنيه المصري.",
      },
      { property: "og:title", content: "تحليل المصروفات" },
      { property: "og:description", content: "أكبر بنود الصرف ونسبتها من إجمالى المصروفات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExpenseAnalysisReport,
});
