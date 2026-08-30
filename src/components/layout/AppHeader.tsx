import { Menu } from "lucide-react";

import { GlobalSearch } from "@/components/layout/GlobalSearch";

interface Props {
  moduleLabel: string;
  crumb: string;
  onOpenMobile: () => void;
}

export function AppHeader({ moduleLabel, crumb, onOpenMobile }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-sidebar-border/40 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-md p-1.5 hover:bg-sidebar-accent lg:hidden"
          aria-label="القائمة"
        >
          <Menu className="size-5" />
        </button>
        <div className="hidden whitespace-nowrap text-sm sm:block">
          <span className="text-sidebar-foreground/60">{moduleLabel}</span>
          <span className="mx-2 text-sidebar-foreground/40">/</span>
          <span className="font-semibold">{crumb}</span>
        </div>
        <GlobalSearch />
      </div>
    </header>
  );
}
