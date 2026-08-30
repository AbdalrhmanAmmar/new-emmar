import { createFileRoute } from "@tanstack/react-router";

import { HrDashboard } from "@/components/hr/HrDashboard";

export const Route = createFileRoute("/hr/")({
  head: () => ({
    meta: [
      { title: "لوحة الموظفين — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "حضور اليوم ومستحقات الشهر والمدفوع والسلف بالرسومات التحليلية." },
      { property: "og:title", content: "لوحة الموظفين" },
      { property: "og:description", content: "مؤشرات الحضور والمستحقات حسب القسم." },
    ],
  }),
  component: HrDashboard,
});
