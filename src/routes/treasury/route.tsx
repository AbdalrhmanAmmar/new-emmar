import { createFileRoute } from "@tanstack/react-router";

import { TreasuryLayout } from "@/components/treasury/TreasuryLayout";

export const Route = createFileRoute("/treasury")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "الخزينة والمعاملات المالية — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "إدارة الخزن والحسابات البنكية وسندات القبض والصرف والتقفيل اليومي بالجنيه المصري.",
      },
      { property: "og:title", content: "موديول الخزينة والمالية — الإيمان لتجارة الأعلاف" },
      {
        property: "og:description",
        content: "خزن وحسابات بنكية، سندات قبض وصرف، تسوية فواتير آجلة، وتقفيل ورديات.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TreasuryLayout,
});
