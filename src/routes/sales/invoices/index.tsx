import { createFileRoute } from "@tanstack/react-router";

import { SalesInvoiceList } from "@/components/sales/SalesInvoiceList";

export const Route = createFileRoute("/sales/invoices/")({
  head: () => ({
    meta: [
      { title: "فواتير المبيعات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "سجل فواتير المبيعات مع الطباعة والتعديل والترحيل." },
      { property: "og:title", content: "فواتير المبيعات" },
      { property: "og:description", content: "بيع نقدي وشبكة وآجل ومتعدد مع تسوية فورية." },
    ],
  }),
  component: SalesInvoiceList,
});
