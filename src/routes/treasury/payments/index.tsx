import { createFileRoute } from "@tanstack/react-router";

import { VoucherList } from "@/components/treasury/VoucherList";

export const Route = createFileRoute("/treasury/payments/")({
  head: () => ({
    meta: [
      { title: "سندات الصرف — الخزينة" },
      { name: "description", content: "سجل سندات الصرف للموردين والمصروفات مع الطباعة وتسوية الفواتير." },
      { property: "og:title", content: "سندات الصرف" },
      { property: "og:description", content: "مدفوعات الموردين والمصروفات النقدية بالجنيه المصري." },
    ],
  }),
  component: () => <VoucherList kind="payment" />,
});
