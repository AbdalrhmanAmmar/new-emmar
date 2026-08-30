import { createFileRoute } from "@tanstack/react-router";

import { ReturnsPage } from "@/components/returns/ReturnsPage";

export const Route = createFileRoute("/returns/purchase")({
  head: () => ({
    meta: [
      { title: "مرتجع مشتريات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "إرجاع بضاعة للمورد وخروجها من المخزن مع إشعار مدين أو تحصيل نقدى." },
      { property: "og:title", content: "مرتجعات المشتريات" },
      { property: "og:description", content: "إذن مرتجع صادر تلقائى وتخفيض المستحق للمورد." },
    ],
  }),
  component: () => <ReturnsPage kind="purchase" />,
});
