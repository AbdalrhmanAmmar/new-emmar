import { createFileRoute } from "@tanstack/react-router";

import { EmployeeForm } from "@/components/hr/EmployeeForm";
import { useDb } from "@/lib/mockDb";

export const Route = createFileRoute("/hr/employees/$id/edit")({
  head: () => ({
    meta: [
      { title: "تعديل بيانات موظف — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل بيانات الموظف وأجره وبدلاته وخصوماته وحالته." },
      { property: "og:title", content: "تعديل بيانات موظف" },
      { property: "og:description", content: "تحديث الوظيفة والقسم ونوع الأجر وأيام العمل." },
    ],
  }),
  component: EditEmployee,
});

function EditEmployee() {
  const { id } = Route.useParams();
  const data = useDb();
  const employee = data.employees.find((e) => e.id === id);
  if (!employee) return <p className="p-6 text-sm text-muted-foreground">الموظف غير موجود</p>;
  return <EmployeeForm employee={employee} />;
}
