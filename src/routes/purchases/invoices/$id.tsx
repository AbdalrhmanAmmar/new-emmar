import { createFileRoute } from "@tanstack/react-router";

import { PurchaseInvoiceEditor } from "@/components/purchases/PurchaseInvoiceEditor";
import { useDb } from "@/lib/mockDb";

export const Route = createFileRoute("/purchases/invoices/$id")({
  head: () => ({
    meta: [
      { title: "تعديل فاتورة مشتريات — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تعديل بيانات وأصناف فاتورة شراء قائمة وإعادة ترحيلها." },
      { property: "og:title", content: "تعديل فاتورة مشتريات" },
      { property: "og:description", content: "تعديل الأصناف وأسعار التوريد وطريقة السداد." },
    ],
  }),
  component: EditPurchase,
});

function EditPurchase() {
  const { id } = Route.useParams();
  const data = useDb();
  const invoice = data.purchaseInvoices.find((i) => i.id === id);
  if (!invoice) return <p className="p-6 text-sm text-muted-foreground">الفاتورة غير موجودة</p>;
  return <PurchaseInvoiceEditor invoice={invoice} />;
}
