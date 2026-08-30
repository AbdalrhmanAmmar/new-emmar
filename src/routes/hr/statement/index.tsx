import { createFileRoute } from "@tanstack/react-router";

import { EmployeeStatement } from "@/components/hr/EmployeeStatement";

export const Route = createFileRoute("/hr/statement/")({
  head: () => ({
    meta: [
      { title: "كشف حساب موظف — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "كشف شهرى أو لفترة محددة يوضح الحضور والمستحق والمدفوع والرصيد." },
      { property: "og:title", content: "كشف حساب موظف" },
      { property: "og:description", content: "طباعة A4 احترافية لكشف حساب أى موظف." },
    ],
  }),
  component: EmployeeStatement,
});
