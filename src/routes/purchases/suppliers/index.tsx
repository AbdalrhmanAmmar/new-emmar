import { createFileRoute } from "@tanstack/react-router";

import { SuppliersPage } from "@/components/purchases/SuppliersPage";

export const Route = createFileRoute("/purchases/suppliers/")({
  head: () => ({
    meta: [
      { title: "الموردون — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "بيانات الموردين وأرصدتهم وإجمالى المشتريات والمستحقات." },
      { property: "og:title", content: "الموردون" },
      { property: "og:description", content: "إدارة الموردين وأسعار التوريد والمستحقات." },
    ],
  }),
  component: SuppliersPage,
});
