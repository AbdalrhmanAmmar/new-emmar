import { createFileRoute } from "@tanstack/react-router";

import { ReturnsPage } from "@/components/returns/ReturnsPage";

export const Route = createFileRoute("/sales/returns/")({
  head: () => ({
    meta: [
      { title: "مرتجعات المبيعات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "سجل مرتجعات المبيعات مع القيم والكميات وطريقة التسوية وأذون الإرجاع للمخزن." },
      { property: "og:title", content: "مرتجعات المبيعات" },
      { property: "og:description", content: "إرجاع بضاعة من العميل للمخزن مع إشعار دائن أو رد نقدى." },
    ],
  }),
  component: () => <ReturnsPage kind="sales" />,
});
