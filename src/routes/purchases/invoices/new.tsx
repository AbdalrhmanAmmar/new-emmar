import { createFileRoute } from "@tanstack/react-router";

import { PurchaseInvoiceEditor } from "@/components/purchases/PurchaseInvoiceEditor";

export const Route = createFileRoute("/purchases/invoices/new")({
  head: () => ({
    meta: [
      { title: "فاتورة مشتريات جديدة — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "شاشة إنشاء فاتورة شراء بأصناف وخصومات وضريبة وسداد فوري." },
      { property: "og:title", content: "فاتورة مشتريات جديدة" },
      { property: "og:description", content: "جدول أصناف ديناميكي وملخص مالي فوري وتحديث تكلفة المخزون." },
    ],
  }),
  component: () => <PurchaseInvoiceEditor />,
});
