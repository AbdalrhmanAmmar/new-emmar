import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/treasury" });
  },
  head: () => ({
    meta: [
      { title: "الإيمان لتجارة الأعلاف | الخزينة والمعاملات المالية" },
      {
        name: "description",
        content: "نظام الخزينة والمعاملات المالية لشركة الإيمان لتجارة الأعلاف: خزن وسندات قبض وصرف وتقفيل يومي.",
      },
      { property: "og:title", content: "الإيمان لتجارة الأعلاف | الخزينة والمعاملات المالية" },
      {
        property: "og:description",
        content: "إدارة التدفقات النقدية والخزن والحسابات البنكية بالجنيه المصري.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => null,
});
