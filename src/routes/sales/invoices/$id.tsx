import { createFileRoute } from "@tanstack/react-router";

import { SalesInvoiceEditor } from "@/components/sales/SalesInvoiceEditor";
import { useDb } from "@/lib/mockDb";

export const Route = createFileRoute("/sales/invoices/$id")({
  head: () => ({
    meta: [
      { title: "تعديل فاتورة مبيعات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل بيانات وأصناف فاتورة مبيعات قائمة وإعادة ترحيلها." },
      { property: "og:title", content: "تعديل فاتورة مبيعات" },
      { property: "og:description", content: "تعديل الأصناف والخصومات وطريقة الدفع." },
    ],
  }),
  component: EditInvoice,
});

function EditInvoice() {
  const { id } = Route.useParams();
  const data = useDb();
  const invoice = data.salesInvoices.find((i) => i.id === id);
  if (!invoice) return <p className="p-6 text-sm text-muted-foreground">الفاتورة غير موجودة</p>;
  return <SalesInvoiceEditor invoice={invoice} />;
}
