import { createFileRoute } from "@tanstack/react-router";

import { VatReport } from "@/components/reports/VatReport";

export const Route = createFileRoute("/reports/vat")({
  head: () => ({
    meta: [
      { title: "الإقرار الضريبى — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "الإقرار الضريبى لضريبة القيمة المضافة: ضريبة المبيعات المحصلة مقابل ضريبة المشتريات وصافى المستحق.",
      },
      { property: "og:title", content: "الإقرار الضريبى" },
      { property: "og:description", content: "ضريبة المبيعات والمشتريات وصافى المستحق لمصلحة الضرائب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VatReport,
});
