import { createFileRoute } from "@tanstack/react-router";

import { EmployeeStatement } from "@/components/hr/EmployeeStatement";
import { useDb } from "@/lib/mockDb";

export const Route = createFileRoute("/hr/employees/$id/")({
  head: () => ({
    meta: [
      { title: "ملف الموظف — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "كشف حساب الموظف: الحضور والمستحقات والمدفوع والرصيد المتبقى." },
      { property: "og:title", content: "ملف وكشف حساب الموظف" },
      { property: "og:description", content: "تفاصيل الحضور والسلف والرواتب قابلة للطباعة A4." },
    ],
  }),
  component: EmployeeProfile,
});

function EmployeeProfile() {
  const { id } = Route.useParams();
  const data = useDb();
  const employee = data.employees.find((e) => e.id === id);
  if (!employee) return <p className="p-6 text-sm text-muted-foreground">الموظف غير موجود</p>;
  return <EmployeeStatement employeeId={employee.id} />;
}
