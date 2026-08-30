import * as React from "react";
import { ChevronLeft, ChevronRight, Search, X as XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const PAGE_SIZES = [10, 25, 50, 100, 200];

type TableCtx = {
  query: string;
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setTotal: (n: number) => void;
  paginate: boolean;
};

const TableContext = React.createContext<TableCtx | null>(null);

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  /** تعطيل الترقيم لهذا الجدول */
  paginate?: boolean;
  /** عدد الصفوف الافتراضي في الصفحة */
  defaultPageSize?: number;
  /** تعطيل توسيع/تضييق الأعمدة */
  resizableColumns?: boolean;
  /** تعطيل مربع البحث داخل الجدول */
  searchable?: boolean;
  /** نص إرشادي لمربع البحث */
  searchPlaceholder?: string;
};

/** استخراج نص الصف لمطابقته مع كلمة البحث. */
export function nodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(" ");
  if (React.isValidElement(node)) {
    const props = node.props as Record<string, any>;
    const extra = [props?.title, props?.["aria-label"], props?.value]
      .filter((v) => typeof v === "string" || typeof v === "number")
      .join(" ");
    return `${nodeText(props?.children)} ${extra}`;
  }
  return "";
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    {
      className,
      paginate = true,
      defaultPageSize = 25,
      resizableColumns = true,
      searchable = true,
      searchPlaceholder = "بحث في الجدول…",
      ...props
    },
    ref,
  ) => {
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(defaultPageSize);
    const [total, setTotal] = React.useState(0);
    const [query, setQuery] = React.useState("");

    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    React.useEffect(() => {
      if (page > pageCount) setPage(pageCount);
    }, [page, pageCount]);

    const ctx = React.useMemo<TableCtx>(
      () => ({ query: searchable ? query : "", page, pageSize, setPage, setTotal, paginate }),
      [query, searchable, page, pageSize, paginate],
    );

    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(total, page * pageSize);

    return (
      <TableContext.Provider value={ctx}>
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          {searchable && (
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute inset-y-0 end-3 my-auto h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                dir="rtl"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-xl border border-border bg-card pe-9 ps-9 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {query && (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  onClick={() => setQuery("")}
                  className="absolute inset-y-0 start-2 my-auto grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            title="طباعة الجدول"
            onClick={() => printTableElement(wrapRef.current?.querySelector("table") ?? null)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm text-foreground shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <PrinterIcon className="h-4 w-4" /> طباعة
          </button>
        </div>
        <div
          ref={wrapRef}
          className="table-scroll-x relative w-full overflow-x-auto [-webkit-overflow-scrolling:touch]"
        >
          <table
            ref={ref}
            data-resizable={resizableColumns ? "true" : undefined}
            className={cn("w-full min-w-[640px] caption-bottom text-sm whitespace-nowrap", className)}
            {...props}
          />
        </div>

        {paginate && total > 1 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <div className="flex items-center gap-1.5">
              {PAGE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  className={cn(
                    "h-8 min-w-9 rounded-full border px-2.5 text-xs font-semibold transition-colors",
                    size === pageSize
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {size}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {`صفحة ${page} من ${pageCount} (${from}-${to} من ${total} عنصر)`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="السابق"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                {pageWindow(page, pageCount).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p as number)}
                      className={cn(
                        "h-8 min-w-8 rounded-full border px-2 text-xs font-semibold transition-colors",
                        p === page
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  aria-label="التالي"
                  disabled={page >= pageCount}
                  onClick={() => setPage(page + 1)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </TableContext.Provider>
    );
  },
);
Table.displayName = "Table";

function pageWindow(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (end < pageCount - 1) pages.push("…");
  pages.push(pageCount);
  return pages;
}

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-muted/50 [&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(TableContext);
  const allRows = React.Children.toArray(children);
  const q = (ctx?.query ?? "").trim().toLowerCase();
  const rows = React.useMemo(
    () => (q ? allRows.filter((r) => nodeText(r).toLowerCase().includes(q)) : allRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [children, q],
  );
  const total = rows.length;

  React.useEffect(() => {
    ctx?.setTotal(total);
  }, [ctx, total]);

  const visible =
    ctx && ctx.paginate && total > ctx.pageSize
      ? rows.slice((ctx.page - 1) * ctx.pageSize, ctx.page * ctx.pageSize)
      : rows;

  return (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props}>
      {q && total === 0 ? (
        <tr>
          <td colSpan={99} className="p-8 text-center text-sm text-muted-foreground">
            لا نتائج مطابقة لكلمة البحث
          </td>
        </tr>
      ) : (
        visible
      )}
    </tbody>
  );
});
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

/** مقبض سحب لتغيير عرض العمود */
function ColumnResizer() {
  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).closest("th") as HTMLTableCellElement | null;
    if (!th) return;
    const table = th.closest("table") as HTMLTableElement | null;
    if (table) table.style.tableLayout = "fixed";
    const rtl = getComputedStyle(th).direction === "rtl";
    const startX = e.clientX;
    const startWidth = th.getBoundingClientRect().width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      const delta = rtl ? startX - ev.clientX : ev.clientX - startX;
      const next = Math.max(56, startWidth + delta);
      th.style.width = `${next}px`;
      th.style.minWidth = `${next}px`;
      th.style.maxWidth = `${next}px`;
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      title="اسحب لتغيير عرض العمود"
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-y-1 end-0 z-10 w-1.5 cursor-col-resize rounded bg-border/60 opacity-0 transition-opacity hover:bg-primary group-hover/th:opacity-100"
    />
  );
}

type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement> & { resizable?: boolean };

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, resizable = true, children, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "group/th relative h-10 px-2 text-center align-middle font-semibold text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    >
      {children}
      {resizable && <ColumnResizer />}
    </th>
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle text-right [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
