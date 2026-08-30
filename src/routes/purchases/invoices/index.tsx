import { createFileRoute } from "@tanstack/react-router";

import { PurchaseInvoiceList } from "@/components/purchases/PurchaseInvoiceList";

export const Route = createFileRoute("/purchases/invoices/")({
  head: () => ({
    meta: [
      { title: "فواتير المشتريات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "سجل فواتير الشراء مع الطباعة والتعديل والترحيل." },
      { property: "og:title", content: "فواتير المشتريات" },
      { property: "og:description", content: "شراء نقدي وتحويل وآجل مع سداد فوري وتحديث المخزون." },
    ],
  }),
  component: PurchaseInvoiceList,
});
