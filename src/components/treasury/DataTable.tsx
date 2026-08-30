import { ChevronLeft, ChevronRight, Printer, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { printTable } from "@/lib/printDoc";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** القيمة النصية المستخدمة في البحث والطباعة */
  text?: (row: T) => string;
  align?: "right" | "center" | "left";
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Array<Column<T>>;
  rowId: (row: T) => string;
  title?: string;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  actions?: (row: T) => ReactNode;
  emptyText?: string;
  footerNote?: ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  rowId,
  title,
  searchPlaceholder = "بحث في الجدول...",
  toolbar,
  actions,
  emptyText = "لا توجد بيانات",
  footerNote,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const rowText = (row: T) =>
    columns
      .map((col) => (col.text ? col.text(row) : ""))
      .join(" | ")
      .toLowerCase();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => rowText(row).includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query, columns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  const doPrint = () => {
    printTable(
      title ?? "تقرير",
      columns.map((c) => c.header),
      filtered.map((row) => columns.map((c) => (c.text ? c.text(row) : ""))),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            dir="rtl"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="pe-9 text-right"
          />
        </div>
        {toolbar}
        <Button type="button" variant="outline" size="sm" onClick={doPrint} className="gap-1.5">
          <Printer className="size-4" />
          طباعة الجدول
        </Button>
      </div>

      <div className="table-scroll-x overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className="text-center font-semibold text-foreground"
                >
                  {col.header}
                </TableHead>
              ))}
              {actions ? <TableHead className="w-16 text-center">إجراءات</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-28 text-center text-sm text-muted-foreground"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={rowId(row)} className="hover:bg-primary/5">
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={
                        col.align === "center"
                          ? "text-center"
                          : col.align === "left"
                            ? "text-left"
                            : "text-right"
                      }
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                  {actions ? <TableCell className="text-center">{actions(row)}</TableCell> : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>عدد الصفوف</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>
            إجمالي {filtered.length} سجل — صفحة {current} من {pageCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {footerNote}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            disabled={current >= pageCount}
            onClick={() => setPage(current + 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
