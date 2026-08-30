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

  // Extract a readable label for each action (title / aria-label) so the
  // menu shows icon + text rows instead of bare icons.
  const rows = items.map((child, i) => {
    if (!React.isValidElement(child)) return child;
    const props = child.props as Record<string, unknown>;
    const label = (props["title"] ?? props["aria-label"]) as string | undefined;
    return (
      <React.Fragment key={(child.key as string) ?? i}>
        {React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
          title: undefined,
          "aria-label": label,
          children: (
            <>
              {(child.props as { children?: React.ReactNode }).children}
              {label ? <span className="flex-1 text-start">{label}</span> : null}
            </>
          ),
        })}
      </React.Fragment>
    );
  });

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
          <div className="flex flex-col gap-1 pt-1 [&>button]:flex [&>button]:w-full [&>button]:items-center [&>button]:justify-start [&>button]:gap-2 [&>button]:rounded-md [&>button]:px-2.5 [&>button]:py-1.5 [&>button]:text-sm [&>button]:text-foreground [&>button]:transition-colors [&>button:hover]:bg-primary [&>button:hover]:text-primary-foreground [&>button:hover]:border-transparent [&>button:focus-visible]:bg-primary [&>button:focus-visible]:text-primary-foreground [&>button]:border [&>button]:border-transparent [&>button]:bg-transparent [&>button]:cursor-pointer">
            {items}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default RowActions;
