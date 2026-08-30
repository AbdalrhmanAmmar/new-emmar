import { createFileRoute } from "@tanstack/react-router";

import { AdjustmentsPage } from "@/components/hr/AdjustmentsPage";

export const Route = createFileRoute("/hr/adjustments/")({
  head: () => ({
    meta: [
      { title: "البدلات والخصومات — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "إضافة بدلات وخصومات للموظفين مرتبطة بشهر محدد تُحسب تلقائيًا فى مسير الرواتب.",
      },
      { property: "og:title", content: "بدلات وخصومات الموظفين" },
      { property: "og:description", content: "بدل انتقالات، حوافز، جزاءات وتأمينات لكل شهر على حدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdjustmentsPage,
});
