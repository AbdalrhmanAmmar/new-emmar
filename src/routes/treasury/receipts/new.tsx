import { createFileRoute } from "@tanstack/react-router";

import { VoucherForm } from "@/components/treasury/VoucherForm";

export const Route = createFileRoute("/treasury/receipts/new")({
  head: () => ({
    meta: [
      { title: "سند قبض جديد — الخزينة" },
      { name: "description", content: "تسجيل سند قبض وربطه بالخزينة والفرع والمستخدم وتسوية الفواتير الآجلة." },
      { property: "og:title", content: "سند قبض جديد" },
      { property: "og:description", content: "إدخال المبلغ وطريقة الدفع وتوزيعه على الفواتير المفتوحة." },
    ],
  }),
  component: () => <VoucherForm kind="receipt" />,
});
