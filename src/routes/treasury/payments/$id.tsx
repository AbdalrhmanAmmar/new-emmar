import { createFileRoute } from "@tanstack/react-router";

import { VoucherForm } from "@/components/treasury/VoucherForm";

export const Route = createFileRoute("/treasury/payments/$id")({
  head: () => ({
    meta: [
      { title: "تعديل سند صرف — الخزينة" },
      { name: "description", content: "تعديل بيانات سند صرف وإعادة توزيع التسوية على الفواتير." },
      { property: "og:title", content: "تعديل سند صرف" },
      { property: "og:description", content: "تحديث المبلغ وطريقة الدفع والتسويات مع تصحيح أرصدة الخزينة." },
    ],
  }),
  component: EditVoucher,
});

function EditVoucher() {
  const { id } = Route.useParams();
  return <VoucherForm kind="payment" voucherId={id} />;
}
