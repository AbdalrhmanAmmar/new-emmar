import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/purchases")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "الموردون والمشتريات — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "فواتير الشراء النقدية والآجلة، الموردون، أسعار التوريد، وتقارير المشتريات بالجنيه المصري.",
      },
      { property: "og:title", content: "موديول الموردون والمشتريات" },
      { property: "og:description", content: "شاشة شراء متكاملة بأصناف وخصومات وضريبة 14% وسداد فوري." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppLayout,
});
