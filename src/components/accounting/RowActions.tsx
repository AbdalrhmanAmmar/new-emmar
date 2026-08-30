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
        <DropdownMenuContent align="center" className="min-w-[10rem] p-1.5">
          <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground">
            الإجراءات
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="flex flex-col gap-0.5 pt-1 [&_button]:flex [&_button]:w-full [&_button]:items-center [&_button]:justify-start [&_button]:gap-2 [&_button]:rounded-md [&_button]:px-2.5 [&_button]:py-2 [&_button]:text-sm [&_button]:text-foreground [&_button]:transition-colors [&_button]:cursor-pointer [&_button]:border [&_button]:border-transparent [&_button]:bg-transparent [&_button:hover]:bg-primary [&_button:hover]:text-primary-foreground [&_button:focus-visible]:bg-primary [&_button:focus-visible]:text-primary-foreground">
            {rows}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default RowActions;
