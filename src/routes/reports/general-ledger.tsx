import { createFileRoute } from "@tanstack/react-router";

import { GeneralLedgerReport } from "@/components/reports/GeneralLedgerReport";

export const Route = createFileRoute("/reports/general-ledger")({
  head: () => ({
    meta: [
      { title: "دفتر الأستاذ العام — الإيمان لتجارة الأعلاف" },
      {
        name: "description",
        content: "دفتر الأستاذ العام: حركة أى حساب بالتفصيل مع الرصيد الافتتاحى والمتجدد والختامى بالجنيه المصري.",
      },
      { property: "og:title", content: "دفتر الأستاذ العام" },
      { property: "og:description", content: "حركة الحسابات بالتفصيل مع الأرصدة المتجددة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GeneralLedgerReport,
});
