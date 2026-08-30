import { createFileRoute } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/users")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إدارة المستخدمين والصلاحيات — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "تكويد مستخدمى النظام باسم دخول وكلمة مرور وتوزيع صلاحيات تفصيلية لكل شاشة.",
      },
      { property: "og:title", content: "إدارة المستخدمين والصلاحيات" },
      { property: "og:description", content: "أدوار وصلاحيات عرض وإضافة وتعديل وحذف وترحيل وطباعة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppLayout,
});
