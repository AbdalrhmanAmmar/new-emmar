import { createFileRoute } from "@tanstack/react-router";

import { CustomerStatementReport } from "@/components/reports/CustomerStatement";

export const Route = createFileRoute("/reports/customer-statement")({
  head: () => ({
    meta: [
      { title: "كشف حساب عميل — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "كشف حساب عميل تفصيلى: الفواتير والمسحوبات والتحصيلات والرصيد المستحق بالجنيه المصري.",
      },
      { property: "og:title", content: "كشف حساب عميل" },
      { property: "og:description", content: "كشف حساب قابل للطباعة بكل حركات العميل ورصيده الحالى." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerStatementReport,
});
