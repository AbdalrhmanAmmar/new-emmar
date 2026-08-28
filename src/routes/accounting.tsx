import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AccountingLayout } from "@/components/accounting/AccountingLayout";

export const Route = createFileRoute("/accounting")({
  component: AccountingLayoutRoute,
});

function AccountingLayoutRoute() {
  return (
    <AccountingLayout>
      <Outlet />
    </AccountingLayout>
  );
}
