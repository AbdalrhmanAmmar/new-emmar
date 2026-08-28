import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccJournalEntriesPage";

export const Route = createFileRoute("/accounting/journal-entries")({
  head: () => ({
    meta: [
      { title: "القيود اليومية | موديول الحسابات" },
      { name: "description", content: "القيود اليومية — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "القيود اليومية | موديول الحسابات" },
      { property: "og:description", content: "القيود اليومية — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
