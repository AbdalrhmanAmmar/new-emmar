import { createFileRoute } from "@tanstack/react-router";

import { ReturnForm } from "@/components/returns/ReturnForm";

export const Route = createFileRoute("/sales/returns/new")({
  head: () => ({
    meta: [
      { title: "مرتجع مبيعات جديد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "إنشاء مرتجع مبيعات من فاتورة أصلية بعدة أصناف ووحدات وتسوية نقدية أو على الحساب." },
      { property: "og:title", content: "مرتجع مبيعات جديد" },
      { property: "og:description", content: "تحميل أصناف الفاتورة الأصلية ومنع الإرجاع بأكثر من المفوتر." },
    ],
  }),
  component: () => <ReturnForm initialKind="sales" />,
});
