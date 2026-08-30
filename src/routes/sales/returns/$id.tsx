import { createFileRoute } from "@tanstack/react-router";

import { ReturnForm } from "@/components/returns/ReturnForm";

export const Route = createFileRoute("/sales/returns/$id")({
  head: () => ({
    meta: [
      { title: "تعديل مرتجع مبيعات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل أصناف وكميات وتسوية مرتجع مبيعات قائم وإعادة ترحيله." },
      { property: "og:title", content: "تعديل مرتجع مبيعات" },
      { property: "og:description", content: "تصحيح أثر المرتجع على المخزون وحساب العميل تلقائياً." },
    ],
  }),
  component: EditSalesReturn,
});

function EditSalesReturn() {
  const { id } = Route.useParams();
  return <ReturnForm returnId={id} />;
}
