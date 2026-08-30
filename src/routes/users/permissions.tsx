import { createFileRoute } from "@tanstack/react-router";

import { PermissionsPage } from "@/components/users/PermissionsPage";

export const Route = createFileRoute("/users/permissions")({
  head: () => ({
    meta: [
      { title: "الصلاحيات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "مصفوفة صلاحيات تفصيلية لكل دور: عرض وإضافة وتعديل وحذف وترحيل وطباعة." },
      { property: "og:title", content: "توزيع الصلاحيات" },
      { property: "og:description", content: "تحكم كامل فى صلاحيات كل شاشة لكل دور." },
    ],
  }),
  component: PermissionsPage,
});
