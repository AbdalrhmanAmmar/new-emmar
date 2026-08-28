import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, RotateCcw, Wallet, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { accountingNav } from "@/lib/accountingNav";
import { resetDb } from "@/lib/mockDb";

export function AccountingLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-card px-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="القائمة"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <Link to="/accounting" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold">برنامج إعمار المحاسبى</span>
        </Link>
        <span className="ms-auto hidden text-xs text-muted-foreground sm:inline">
          الوضع الافتراضي — بيانات تجريبية محلية
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetDb();
            window.location.reload();
          }}
        >
          <RotateCcw className="me-1 h-4 w-4" />
          إعادة تعيين البيانات
        </Button>
      </header>

      <div className="flex">
        <aside
          className={`${open ? "block" : "hidden"} fixed inset-y-16 start-0 z-30 w-72 overflow-y-auto border-e border-border bg-card p-3 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:shrink-0`}
        >
          <nav className="space-y-4">
            {accountingNav.map((group) => (
              <div key={group.title}>
                <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">{group.title}</p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setOpen(false)}
                          className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-accent hover:text-accent-foreground"
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default AccountingLayout;
