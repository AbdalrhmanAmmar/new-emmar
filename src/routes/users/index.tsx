import { createFileRoute } from "@tanstack/react-router";

import { UsersPage } from "@/components/users/UsersPage";

export const Route = createFileRoute("/users/")({
  head: () => ({
    meta: [
      { title: "المستخدمون — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "سجل مستخدمى النظام وبيانات الدخول والفرع ودور الصلاحيات." },
      { property: "og:title", content: "سجل المستخدمين" },
      { property: "og:description", content: "إضافة وإيقاف وتغيير كلمات مرور المستخدمين." },
    ],
  }),
  component: UsersPage,
});
