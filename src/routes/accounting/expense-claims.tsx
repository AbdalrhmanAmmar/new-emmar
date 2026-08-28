import { createFileRoute } from "@tanstack/react-router";

import Page from "@/pages/accounting/AccExpenseClaimsPage";

export const Route = createFileRoute("/accounting/expense-claims")({
  head: () => ({
    meta: [
      { title: "مطالبات المصروفات | موديول الحسابات" },
      { name: "description", content: "مطالبات المصروفات — شاشة ضمن موديول الحسابات بالوضع الافتراضي مع بيانات تجريبية." },
      { property: "og:title", content: "مطالبات المصروفات | موديول الحسابات" },
      { property: "og:description", content: "مطالبات المصروفات — شاشة ضمن موديول الحسابات بالوضع الافتراضي." },
    ],
  }),
  component: Page,
});
