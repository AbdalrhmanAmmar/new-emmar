import { createFileRoute } from "@tanstack/react-router";

import { SalesInvoiceWorkspace } from "@/components/sales/SalesInvoiceWorkspace";

export const Route = createFileRoute("/sales/invoices/new")({
  head: () => ({
    meta: [
      { title: "فاتورة مبيعات جديدة — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "شاشة إنشاء فاتورة مبيعات بأصناف وخصومات وضريبة وتسوية فورية." },
      { property: "og:title", content: "فاتورة مبيعات جديدة" },
      { property: "og:description", content: "جدول أصناف ديناميكي وأدوات سريعة وملخص مالي فوري." },
    ],
  }),
  component: SalesInvoiceWorkspace,
});
