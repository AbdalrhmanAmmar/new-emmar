import { createFileRoute } from "@tanstack/react-router";

import { LoginScreen } from "@/components/auth/LoginScreen";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "تسجيل الدخول إلى نظام الإيمان لتجارة الأعلاف: صلاحيات تفصيلية لكل مستخدم على شاشات النظام.",
      },
      { property: "og:title", content: "تسجيل الدخول | الإيمان لتجارة الأعلاف" },
      {
        property: "og:description",
        content: "دخول آمن لنظام إدارة المبيعات والمشتريات والمخازن والخزينة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginScreen,
});
