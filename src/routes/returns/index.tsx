import { createFileRoute } from "@tanstack/react-router";

import { ReturnsPage } from "@/components/returns/ReturnsPage";

export const Route = createFileRoute("/returns/")({
  head: () => ({
    meta: [
      { title: "كل المرتجعات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "سجل مرتجعات المبيعات والمشتريات مع القيم والكميات وطريقة التسوية." },
      { property: "og:title", content: "سجل المرتجعات" },
      { property: "og:description", content: "متابعة كل المرتجعات وأثرها على المخزون وحسابات العملاء والموردين." },
    ],
  }),
  component: ReturnsPage,
});
