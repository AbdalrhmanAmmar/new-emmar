import { createFileRoute } from "@tanstack/react-router";

import { ReportsHub } from "@/components/reports/ReportsHub";

export const Route = createFileRoute("/reports/")({
  head: () => ({
    meta: [
      { title: "مركز التقارير — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "فهرس كل تقارير البرنامج: الخزينة، السندات، أعمار الديون، والمبيعات." },
      { property: "og:title", content: "مركز التقارير" },
      { property: "og:description", content: "الوصول السريع لكل تقارير الخزينة والمبيعات." },
    ],
  }),
  component: ReportsHub,
});
