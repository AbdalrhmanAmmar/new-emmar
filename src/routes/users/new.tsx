import { createFileRoute } from "@tanstack/react-router";

import { UserForm } from "@/components/users/UserForm";

export const Route = createFileRoute("/users/new")({
  head: () => ({
    meta: [
      { title: "مستخدم جديد — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "إضافة مستخدم جديد باسم دخول وكلمة مرور ودور صلاحيات." },
      { property: "og:title", content: "مستخدم جديد" },
      { property: "og:description", content: "تكويد مستخدم وربطه بفرع ودور صلاحيات." },
    ],
  }),
  component: () => <UserForm />,
});
