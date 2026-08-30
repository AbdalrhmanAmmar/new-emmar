import { createFileRoute } from "@tanstack/react-router";

import { TreasuryDashboard } from "@/components/treasury/TreasuryDashboard";

export const Route = createFileRoute("/treasury/")({
  head: () => ({
    meta: [
      { title: "لوحة الخزينة — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "مؤشرات ورسومات تحليلية لأرصدة الخزن والتدفق النقدي والمستحقات." },
      { property: "og:title", content: "لوحة الخزينة التحليلية" },
      { property: "og:description", content: "أرصدة الخزن، التدفق النقدي، أعمار الديون، وأكبر المدينين." },
    ],
  }),
  component: TreasuryDashboard,
});
