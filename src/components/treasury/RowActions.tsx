import { Settings2 } from "lucide-react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RowAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function RowActions({ actions }: { actions: RowAction[] }) {
  const usable = actions.filter(Boolean);
  if (usable.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="الإجراءات"
          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Settings2 className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 text-right">
        <DropdownMenuLabel className="text-xs text-muted-foreground">الإجراءات</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {usable.map((action, index) => (
          <DropdownMenuItem
            key={`${action.label}-${index}`}
            disabled={action.disabled}
            onSelect={(event) => {
              event.preventDefault();
              action.onSelect();
            }}
            className={`gap-2 text-sm ${action.danger ? "text-destructive focus:text-destructive" : ""}`}
          >
            {action.icon}
            <span>{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
