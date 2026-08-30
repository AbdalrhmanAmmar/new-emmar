import { createFileRoute } from "@tanstack/react-router";

import { ReturnForm } from "@/components/returns/ReturnForm";

export const Route = createFileRoute("/purchases/returns/new")({
  head: () => ({
    meta: [
      { title: "مرتجع مشتريات جديد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "إنشاء مرتجع مشتريات من فاتورة شراء أصلية مع تسوية على حساب المورد أو نقدى." },
      { property: "og:title", content: "مرتجع مشتريات جديد" },
      { property: "og:description", content: "إذن مرتجع صادر تلقائى وتخفيض المستحق للمورد." },
    ],
  }),
  component: () => <ReturnForm initialKind="purchase" />,
});
