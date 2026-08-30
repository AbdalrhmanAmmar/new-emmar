import { createFileRoute } from "@tanstack/react-router";

import { VoucherForm } from "@/components/treasury/VoucherForm";

export const Route = createFileRoute("/treasury/payments/new")({
  head: () => ({
    meta: [
      { title: "سند صرف جديد — الخزينة" },
      { name: "description", content: "تسجيل سند صرف وربطه بالخزينة والفرع والمستخدم وتسوية الفواتير الآجلة." },
      { property: "og:title", content: "سند صرف جديد" },
      { property: "og:description", content: "إدخال المبلغ وطريقة الدفع وتوزيعه على الفواتير المفتوحة." },
    ],
  }),
  component: () => <VoucherForm kind="payment" />,
});
