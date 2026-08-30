import { createFileRoute } from "@tanstack/react-router";

import { VoucherList } from "@/components/treasury/VoucherList";

export const Route = createFileRoute("/treasury/receipts/")({
  head: () => ({
    meta: [
      { title: "سندات القبض — الخزينة" },
      { name: "description", content: "سجل سندات القبض من العملاء والإيرادات المتنوعة مع الطباعة والتسوية." },
      { property: "og:title", content: "سندات القبض" },
      { property: "og:description", content: "تحصيلات العملاء والإيرادات المتنوعة بالجنيه المصري." },
    ],
  }),
  component: () => <VoucherList kind="receipt" />,
});
