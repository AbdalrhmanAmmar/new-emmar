import { createFileRoute, useParams } from "@tanstack/react-router";

import { UserForm } from "@/components/users/UserForm";

function EditUser() {
  const { id } = useParams({ from: "/users/$id" });
  return <UserForm userId={id} />;
}

export const Route = createFileRoute("/users/$id")({
  head: () => ({
    meta: [
      { title: "تعديل مستخدم — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل بيانات المستخدم واسم الدخول وكلمة المرور ودور الصلاحيات." },
      { property: "og:title", content: "تعديل مستخدم" },
      { property: "og:description", content: "تحديث بيانات الدخول والفرع والحالة." },
    ],
  }),
  component: EditUser,
});
