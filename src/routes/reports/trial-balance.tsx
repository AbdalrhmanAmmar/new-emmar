import { createFileRoute } from "@tanstack/react-router";

import { TrialBalanceReport } from "@/components/reports/TrialBalanceReport";

export const Route = createFileRoute("/reports/trial-balance")({
  head: () => ({
    meta: [
      { title: "ميزان المراجعة — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "ميزان المراجعة: أرصدة الحسابات الافتتاحية وحركة الفترة والأرصدة الختامية مدين ودائن بالجنيه المصري.",
      },
      { property: "og:title", content: "ميزان المراجعة" },
      { property: "og:description", content: "أرصدة كل الحسابات مع التحقق من توازن الميزان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrialBalanceReport,
});
