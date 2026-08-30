import { createFileRoute } from "@tanstack/react-router";

import { PayrollPage } from "@/components/hr/PayrollPage";

export const Route = createFileRoute("/hr/payroll/")({
  head: () => ({
    meta: [
      { title: "مسير الرواتب — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "مستحقات كل الموظفين فى الشهر بناءً على التحضير والبدلات والسلف." },
      { property: "og:title", content: "مسير الرواتب الشهرى" },
      { property: "og:description", content: "صافى المستحق والمدفوع والمتبقى لكل موظف مع الطباعة." },
    ],
  }),
  component: PayrollPage,
});
