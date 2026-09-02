import { Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { OpenTab } from "@/lib/openTabs";

/** شريط الفواتير المفتوحة — يسمح بالعمل على عدة فواتير فى نفس الوقت */
export function OpenTabsBar({
  tabs,
  activeId,
  onActivate,
  onAdd,
  onClose,
  addLabel = "فاتورة جديدة",
}: {
  tabs: OpenTab[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
  addLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card/80 p-2 shadow-sm">
      <span className="px-1 text-[11px] font-semibold text-muted-foreground">الفواتير المفتوحة</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              className={cn(
                "group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all",
                active
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <button type="button" onClick={() => onActivate(tab.id)} className="flex flex-col items-end text-right">
                <span className="font-bold leading-tight">{tab.label}</span>
                {tab.hint ? <span className="text-[10px] leading-tight opacity-80">{tab.hint}</span> : null}
              </button>
              <button
                type="button"
                title="إغلاق الفاتورة"
                onClick={() => onClose(tab.id)}
                className="rounded-md p-0.5 opacity-60 transition-opacity hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1 rounded-lg border border-dashed border-primary/50 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
      >
        <Plus className="size-3.5" />
        {addLabel}
      </button>
    </div>
  );
}
