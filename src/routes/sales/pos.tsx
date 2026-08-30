import { createFileRoute } from "@tanstack/react-router";

import { PosCashier } from "@/components/sales/PosCashier";

export const Route = createFileRoute("/sales/pos")({
  head: () => ({
    meta: [
      { title: "الكاشير — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "شاشة كاشير سريعة بنمط نقاط البيع لتنفيذ فواتير البيع فوراً." },
      { property: "og:title", content: "شاشة الكاشير" },
      { property: "og:description", content: "بيع سريع بلمسة واحدة مع تسوية نقدية وشبكة وآجل وطباعة فورية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PosCashier,
});
