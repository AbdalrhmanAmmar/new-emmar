import { Link } from "@tanstack/react-router";
import { Boxes, LayoutGrid, Receipt, ShoppingCart, Wallet } from "lucide-react";

import { hasPerm, useCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";

interface Props {
  pathname: string;
  onOpenMenu: () => void;
}

const TABS = [
  { to: "/treasury", label: "الخزينة", screen: "treasury.safes", icon: Wallet },
  { to: "/sales", label: "المبيعات", screen: "sales.invoices", icon: ShoppingCart },
  { to: "/purchases", label: "المشتريات", screen: "purchases.invoices", icon: Receipt },
  { to: "/inventory", label: "المخازن", screen: "inventory.moves", icon: Boxes },
] as const;

/** شريط تابات سفلى بنمط تطبيقات iOS — للموبيل فقط */
export function MobileTabBar({ pathname, onOpenMenu }: Props) {
  const current = useCurrentUser();
  const tabs = TABS.filter((t) => hasPerm(current, t.screen, "view"));

  return (
    <nav
      dir="rtl"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="grid grid-cols-5 items-stretch">
        {tabs.map((tab) => {
          const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="min-w-0">
              <Link
                to={tab.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5 transition-transform", active && "scale-110")} />
                <span className="w-full truncate text-center">{tab.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0">
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex w-full flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-medium text-muted-foreground"
          >
            <LayoutGrid className="size-5" />
            <span className="w-full truncate text-center">المزيد</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
