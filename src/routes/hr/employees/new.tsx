import { createFileRoute } from "@tanstack/react-router";

import { EmployeeForm } from "@/components/hr/EmployeeForm";

export const Route = createFileRoute("/hr/employees/new")({
  head: () => ({
    meta: [
      { title: "موظف جديد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "إضافة موظف جديد بالكود والوظيفة ونوع الأجر والبدلات والخصومات." },
      { property: "og:title", content: "إضافة موظف" },
      { property: "og:description", content: "راتب شهرى أو أجر يومى مع حساب أجر اليوم تلقائيًا." },
    ],
  }),
  component: EmployeeForm,
});
