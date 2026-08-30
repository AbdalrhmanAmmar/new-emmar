import { createFileRoute } from "@tanstack/react-router";

import { ReturnForm } from "@/components/returns/ReturnForm";

export const Route = createFileRoute("/returns/new")({
  head: () => ({
    meta: [
      { title: "مرتجع جديد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "إنشاء مرتجع مبيعات أو مشتريات بعدة أصناف ووحدات من فاتورة أصلية." },
      { property: "og:title", content: "مرتجع جديد" },
      { property: "og:description", content: "تحميل أصناف الفاتورة الأصلية ومنع الإرجاع بأكثر من المفوتر." },
    ],
  }),
  component: () => <ReturnForm />,
});
