import { createFileRoute } from "@tanstack/react-router";

import { JournalReport } from "@/components/reports/JournalReport";

export const Route = createFileRoute("/reports/journal")({
  head: () => ({
    meta: [
      { title: "دفتر اليومية العامة — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "دفتر اليومية العامة: كل القيود المحاسبية المزدوجة من الفواتير والسندات والمصروفات بالجنيه المصري.",
      },
      { property: "og:title", content: "دفتر اليومية العامة" },
      { property: "og:description", content: "قيود اليومية المتولدة تلقائياً من كل مستندات البرنامج." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JournalReport,
});
