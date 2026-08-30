import { createFileRoute } from "@tanstack/react-router";

import { ReturnForm } from "@/components/returns/ReturnForm";

export const Route = createFileRoute("/purchases/returns/$id")({
  head: () => ({
    meta: [
      { title: "تعديل مرتجع مشتريات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل أصناف وكميات وتسوية مرتجع مشتريات قائم وإعادة ترحيله." },
      { property: "og:title", content: "تعديل مرتجع مشتريات" },
      { property: "og:description", content: "تصحيح أثر المرتجع على المخزون وحساب المورد تلقائياً." },
    ],
  }),
  component: EditPurchaseReturn,
});

function EditPurchaseReturn() {
  const { id } = Route.useParams();
  return <ReturnForm returnId={id} />;
}
