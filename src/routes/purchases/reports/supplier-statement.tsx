import { createFileRoute } from "@tanstack/react-router";

import { SupplierStatementReport } from "@/components/reports/SupplierStatement";

export const Route = createFileRoute("/purchases/reports/supplier-statement")({
  head: () => ({
    meta: [
      { title: "كشف حساب مورد — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "كشف حساب مورد تفصيلى قابل للطباعة A4: عمليات الشراء والمدفوعات والرصيد المستحق بالجنيه المصري.",
      },
      { property: "og:title", content: "كشف حساب مورد" },
      { property: "og:description", content: "تفاصيل المشتريات والمدفوعات ورصيد المورد الحالى مع فلترة بالتاريخ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupplierStatementReport,
});
