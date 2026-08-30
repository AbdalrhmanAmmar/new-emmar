import { createFileRoute } from "@tanstack/react-router";

import { ReturnForm } from "@/components/returns/ReturnForm";

export const Route = createFileRoute("/returns/$id")({
  head: () => ({
    meta: [
      { title: "تعديل مرتجع — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل أصناف وكميات وتسوية مرتجع قائم وإعادة ترحيله." },
      { property: "og:title", content: "تعديل مرتجع" },
      { property: "og:description", content: "تصحيح أثر المرتجع على المخزون والحساب تلقائياً." },
    ],
  }),
  component: EditReturn,
});

function EditReturn() {
  const { id } = Route.useParams();
  return <ReturnForm returnId={id} />;
}
