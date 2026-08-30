import { createFileRoute } from "@tanstack/react-router";

import { ReturnsPage } from "@/components/returns/ReturnsPage";

export const Route = createFileRoute("/purchases/returns/")({
  head: () => ({
    meta: [
      { title: "مرتجعات المشتريات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "سجل مرتجعات المشتريات مع القيم والكميات وأذون الإرجاع الصادرة للموردين." },
      { property: "og:title", content: "مرتجعات المشتريات" },
      { property: "og:description", content: "إرجاع بضاعة للمورد وخروجها من المخزن مع إشعار مدين أو تحصيل نقدى." },
    ],
  }),
  component: () => <ReturnsPage kind="purchase" />,
});
