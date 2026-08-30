import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/returns")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "المرتجعات — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "مرتجعات المبيعات والمشتريات مع أذون مخزنية تلقائية وإشعارات دائنة ومدينة.",
      },
      { property: "og:title", content: "موديول المرتجعات" },
      { property: "og:description", content: "مرتجع بيع، مرتجع شراء، وإذن مرتجع مخزنى بتسوية نقدية أو على الحساب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppLayout,
});
