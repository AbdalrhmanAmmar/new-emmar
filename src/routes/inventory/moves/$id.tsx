import { createFileRoute } from "@tanstack/react-router";

import { StockMoveForm } from "@/components/inventory/StockMoveForm";

export const Route = createFileRoute("/inventory/moves/$id")({
  head: () => ({
    meta: [
      { title: "تعديل إذن مخزني — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل أصناف وكميات إذن مخزني يدوى وإعادة ترحيله." },
      { property: "og:title", content: "تعديل إذن مخزني" },
      { property: "og:description", content: "تعديل الكميات والوحدات مع تصحيح أثر المخزون." },
    ],
  }),
  component: EditMove,
});

function EditMove() {
  const { id } = Route.useParams();
  return <StockMoveForm moveId={id} />;
}
