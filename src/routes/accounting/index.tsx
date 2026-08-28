import { Link, createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accountingNav } from "@/lib/accountingNav";

export const Route = createFileRoute("/accounting/")({
  head: () => ({
    meta: [
      { title: "موديول الحسابات | النظام المحاسبي" },
      {
        name: "description",
        content:
          "موديول الحسابات كامل: دليل الحسابات، القيود، الدفاتر، البنوك، الأصول، المقاولات، الموازنات، تقارير ZATCA والقوائم المالية.",
      },
      { property: "og:title", content: "موديول الحسابات | النظام المحاسبي" },
      {
        property: "og:description",
        content: "جميع شاشات الحسابات تعمل بالوضع الافتراضي مع بيانات تجريبية محلية.",
      },
    ],
  }),
  component: AccountingHome,
});

function AccountingHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">موديول الحسابات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          جميع الشاشات تعمل بالوضع الافتراضي على بيانات تجريبية محلية — بدون تسجيل دخول وبدون ربط خارجي.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accountingNav.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle className="text-base">{group.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
