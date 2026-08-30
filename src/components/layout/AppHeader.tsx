import { useRouter } from "@tanstack/react-router";
import { ChevronRight, Menu, Search } from "lucide-react";
import { useState } from "react";

import { GlobalSearch } from "@/components/layout/GlobalSearch";

interface Props {
  moduleLabel: string;
  crumb: string;
  onOpenMobile: () => void;
  canGoBack?: boolean;
}

export function AppHeader({ moduleLabel, crumb, onOpenMobile, canGoBack = false }: Props) {
  const router = useRouter();
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-sidebar-border/40 bg-sidebar/95 pt-[env(safe-area-inset-top)] text-sidebar-foreground backdrop-blur-xl">
      {/* هيدر الموبيل بنمط iOS: زر رجوع + عنوان فى المنتصف + بحث */}
      <div className="grid h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2 lg:hidden">
        <div className="flex items-center">
          {canGoBack ? (
            <button
              type="button"
              onClick={() => router.history.back()}
              className="flex items-center gap-0.5 rounded-full px-1.5 py-1 text-sm text-sidebar-foreground/90 active:opacity-60"
              aria-label="رجوع"
            >
              <ChevronRight className="size-5" />
              رجوع
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenMobile}
              className="rounded-full p-1.5 active:opacity-60"
              aria-label="القائمة"
            >
              <Menu className="size-5" />
            </button>
          )}
        </div>

        <div className="min-w-0 text-center">
          <div className="truncate text-[15px] font-semibold leading-tight">{crumb}</div>
          <div className="truncate text-[10px] text-sidebar-foreground/60">{moduleLabel}</div>
        </div>

        <button
          type="button"
          onClick={() => setMobileSearch((v) => !v)}
          className="rounded-full p-1.5 active:opacity-60"
          aria-label="بحث"
        >
          <Search className="size-5" />
        </button>
      </div>

      {mobileSearch ? (
        <div className="px-2 pb-2 lg:hidden">
          <GlobalSearch />
        </div>
      ) : null}

      {/* هيدر الديسكتوب */}
      <div className="hidden items-center gap-3 px-3 py-2.5 lg:flex">
        <div className="whitespace-nowrap text-sm">
          <span className="text-sidebar-foreground/60">{moduleLabel}</span>
          <span className="mx-2 text-sidebar-foreground/40">/</span>
          <span className="font-semibold">{crumb}</span>
        </div>
        <GlobalSearch />
      </div>
    </header>
  );
}
