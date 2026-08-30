import { createFileRoute } from "@tanstack/react-router";

import { UnitsPage } from "@/components/sales/UnitsPage";

export const Route = createFileRoute("/sales/units/")({
  head: () => ({
    meta: [
      { title: "تكويد الوحدات — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "تكويد وحدات القياس الأساسية (كيلو، طن، شيكارة، قنطار) لاستخدامها كوحدات مخزون وبيع.",
      },
      { property: "og:title", content: "تكويد الوحدات" },
      { property: "og:description", content: "إدارة وحدات القياس المستخدمة فى الأصناف والفواتير." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UnitsPage,
});
