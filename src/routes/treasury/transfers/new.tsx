import { createFileRoute } from "@tanstack/react-router";

import { TransferForm } from "@/components/treasury/TransferForm";

export const Route = createFileRoute("/treasury/transfers/new")({
  head: () => ({
    meta: [
      { title: "تحويل بين الخزن — الخزينة" },
      { name: "description", content: "نقل سيولة بين الخزن والحسابات البنكية مع تسجيل مصاريف التحويل." },
      { property: "og:title", content: "تحويل بين الخزن" },
      { property: "og:description", content: "تحويل داخلي مع التحقق من كفاية الرصيد." },
    ],
  }),
  component: () => <TransferForm />,
});
