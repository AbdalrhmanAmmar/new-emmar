import * as React from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Groups per-row action buttons behind a single gear icon.
 * Children are rendered inside the dropdown as a compact icon rail.
 */
export const RowActions = ({ children }: { children: React.ReactNode }) => {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            aria-label="الإجراءات"
            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary transition-colors"
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[9rem] p-1.5">
          <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground">
            الإجراءات
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="flex flex-wrap items-center justify-center gap-1 pt-1 [&>button]:h-8 [&>button]:w-8 [&>button]:rounded-md [&>button]:border [&>button]:border-border/60 [&>button]:bg-card hover:[&>button]:bg-accent/60">
            {items}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default RowActions;
