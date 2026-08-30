import { createFileRoute } from "@tanstack/react-router";

import { EmployeesPage } from "@/components/hr/EmployeesPage";

export const Route = createFileRoute("/hr/employees/")({
  head: () => ({
    meta: [
      { title: "الموظفون — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تكويد الموظفين وبياناتهم وأجورهم ومستحقات الشهر الحالى." },
      { property: "og:title", content: "سجل الموظفين" },
      { property: "og:description", content: "بيانات كاملة لكل موظف مع المستحق والمدفوع والمتبقى." },
    ],
  }),
  component: EmployeesPage,
});
