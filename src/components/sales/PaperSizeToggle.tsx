import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { PaperSize } from "@/lib/printInvoice";

const STORAGE_KEY = "print.paperSize";

function readStored(): PaperSize {
  if (typeof window === "undefined") return "A4";
  return window.localStorage.getItem(STORAGE_KEY) === "A5" ? "A5" : "A4";
}

/** تفضيل مقاس الطباعة (A4 / A5) محفوظ محلياً لكل مستخدم */
export function usePaperSize(): [PaperSize, (value: PaperSize) => void] {
  const [paper, setPaper] = useState<PaperSize>("A4");

  useEffect(() => {
    setPaper(readStored());
  }, []);

  const update = (value: PaperSize) => {
    setPaper(value);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, value);
  };

  return [paper, update];
}

/** مُبدّل مقاس الطباعة بشكل كبسولة رسمية أنيقة */
export function PaperSizeToggle({
  value,
  onChange,
  label = "مقاس الطباعة",
  className,
}: {
  value: PaperSize;
  onChange: (value: PaperSize) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-card/80 px-2.5 py-1.5 shadow-sm",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <FileText className="size-3.5 text-primary" />
        {label}
      </span>
      <div className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
        {(["A4", "A5"] as PaperSize[]).map((size) => {
          const active = value === size;
          return (
            <button
              key={size}
              type="button"
              onClick={() => onChange(size)}
              aria-pressed={active}
              title={size === "A4" ? "طباعة كاملة على ورق A4" : "طباعة مضغوطة على ورق A5"}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-bold transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}
