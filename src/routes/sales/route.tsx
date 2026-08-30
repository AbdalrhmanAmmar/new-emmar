import { createFileRoute } from "@tanstack/react-router";

import { TreasuryLayout } from "@/components/treasury/TreasuryLayout";

export const Route = createFileRoute("/sales")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "العملاء والمبيعات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "فواتير المبيعات النقدية والآجلة، العملاء، الأصناف والأسعار، وتقارير المبيعات بالجنيه المصري." },
      { property: "og:title", content: "موديول العملاء والمبيعات" },
      { property: "og:description", content: "شاشة بيع متكاملة بأصناف وخصومات وضريبة 14% وتسوية فورية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TreasuryLayout,
});
