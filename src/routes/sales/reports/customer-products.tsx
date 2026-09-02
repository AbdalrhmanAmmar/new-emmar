import { createFileRoute } from "@tanstack/react-router";

import { PartyProductReport } from "@/components/reports/PartyProductReport";

export const Route = createFileRoute("/sales/reports/customer-products")({
  head: () => ({
    meta: [
      { title: "تقرير أصناف العميل — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "حركة صنف أو عدة أصناف مع عميل محدد بالكميات والأسعار خلال فترة." },
      { property: "og:title", content: "تقرير أصناف العميل" },
      { property: "og:description", content: "كميات وأسعار وإجماليات أصناف العميل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PartyProductReport kind="sales" />,
});
