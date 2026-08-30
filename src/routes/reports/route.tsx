import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/reports")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "التقارير — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "موديول التقارير الموحّد: تقارير الخزينة والتدفق النقدي وأعمار الديون وتقارير المبيعات بالجنيه المصري.",
      },
      { property: "og:title", content: "موديول التقارير" },
      { property: "og:description", content: "كل تقارير الخزينة والمبيعات فى مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppLayout,
});
