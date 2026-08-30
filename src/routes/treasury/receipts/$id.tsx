import { createFileRoute } from "@tanstack/react-router";

import { VoucherForm } from "@/components/treasury/VoucherForm";

export const Route = createFileRoute("/treasury/receipts/$id")({
  head: () => ({
    meta: [
      { title: "تعديل سند قبض — الخزينة" },
      { name: "description", content: "تعديل بيانات سند قبض وإعادة توزيع التسوية على الفواتير." },
      { property: "og:title", content: "تعديل سند قبض" },
      { property: "og:description", content: "تحديث المبلغ وطريقة الدفع والتسويات مع تصحيح أرصدة الخزينة." },
    ],
  }),
  component: EditVoucher,
});

function EditVoucher() {
  const { id } = Route.useParams();
  return <VoucherForm kind="receipt" voucherId={id} />;
}
