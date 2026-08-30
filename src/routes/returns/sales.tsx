import { createFileRoute } from "@tanstack/react-router";

import { ReturnsPage } from "@/components/returns/ReturnsPage";

export const Route = createFileRoute("/returns/sales")({
  head: () => ({
    meta: [
      { title: "مرتجع مبيعات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "إرجاع بضاعة من العميل للمخزن مع إشعار دائن أو رد نقدى من الخزينة." },
      { property: "og:title", content: "مرتجعات المبيعات" },
      { property: "og:description", content: "إذن مرتجع وارد تلقائى وتخفيض مديونية العميل." },
    ],
  }),
  component: () => <ReturnsPage kind="sales" />,
});
