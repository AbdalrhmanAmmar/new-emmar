import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/inventory")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "المخازن والمخزون — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "مخازن رئيسية وفرعية وأذون إضافة وصرف تلقائية مرتبطة بفواتير المشتريات والمبيعات.",
      },
      { property: "og:title", content: "موديول المخازن والمخزون" },
      { property: "og:description", content: "تكويد المخازن، أذون الإضافة والصرف والتحويل، وأرصدة كل مخزن." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppLayout,
});
