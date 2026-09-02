import { createFileRoute } from "@tanstack/react-router";

import { PartyProductReport } from "@/components/reports/PartyProductReport";

export const Route = createFileRoute("/purchases/reports/supplier-products")({
  head: () => ({
    meta: [
      { title: "تقرير أصناف المورد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "حركة صنف أو عدة أصناف مع مورد محدد بالكميات وأسعار الشراء خلال فترة." },
      { property: "og:title", content: "تقرير أصناف المورد" },
      { property: "og:description", content: "كميات وأسعار وإجماليات أصناف المورد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PartyProductReport kind="purchases" />,
});
