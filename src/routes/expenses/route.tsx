import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/expenses")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "المصروفات العامة والنثريات — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "تكويد بنود الصرف وتسجيل المصروفات العامة والنثريات ورواتب وسلف الموظفين بالجنيه المصري.",
      },
      { property: "og:title", content: "موديول المصروفات العامة والنثريات" },
      { property: "og:description", content: "بنود صرف مكوّدة، ربط المصروف بموظف، وتحليلات المنصرف." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppLayout,
});
