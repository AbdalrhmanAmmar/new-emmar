import { createFileRoute } from "@tanstack/react-router";

import { ProductsPage } from "@/components/sales/ProductsPage";

export const Route = createFileRoute("/sales/products/")({
  head: () => ({
    meta: [
      { title: "الأصناف والأسعار — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "إدارة أصناف الأعلاف والأسعار والباركود وحدود المخزون." },
      { property: "og:title", content: "الأصناف والأسعار" },
      { property: "og:description", content: "أسعار البيع والجملة والتكلفة والأرصدة المتاحة." },
    ],
  }),
  component: ProductsPage,
});
