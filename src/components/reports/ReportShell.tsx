import { Printer, Search } from "lucide-react";
import type { ReactNode } from "react";

import { PeriodFilter, periodText, type PeriodRange } from "@/components/analytics/PeriodFilter";
import { PageHeader } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** إطار موحّد لكل التقارير المحاسبية: عنوان + فترة + بحث + طباعة */
export function ReportShell({
  title,
  description,
  range,
  onRangeChange,
  onPrint,
  search,
  onSearchChange,
  searchPlaceholder = "بحث...",
  actions,
  children,
}: {
  title: string;
  description?: string;
  range?: PeriodRange;
  onRangeChange?: (r: PeriodRange) => void;
  onPrint?: () => void;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {actions}
            {onPrint ? (
              <Button type="button" className="gap-1.5" onClick={onPrint}>
                <Printer className="size-4" />
                طباعة
              </Button>
            ) : null}
          </>
        }
      />

      {range && onRangeChange ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2">
          <PeriodFilter value={range} onChange={onRangeChange} />
          <div className="flex flex-wrap items-center gap-2">
            {onSearchChange ? (
              <div className="relative">
                <Search className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search ?? ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 w-56 pr-8"
                />
              </div>
            ) : null}
            <span className="text-xs font-semibold text-muted-foreground">{periodText(range)}</span>
          </div>
        </div>
      ) : onSearchChange ? (
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pr-8"
          />
        </div>
      ) : null}

      {children}
    </div>
  );
}

export interface ReportColumn<T> {
  key: string;
  label: string;
  /** محتوى الخلية فى الشاشة */
  cell: (row: T) => ReactNode;
  /** نص الخلية عند الطباعة */
  text?: (row: T) => string;
  numeric?: boolean;
  className?: string;
}

/** جدول تقرير مع صف إجماليات اختيارى */
export function ReportTable<T>({
  columns,
  rows,
  footer,
  empty = "لا توجد بيانات فى هذه الفترة",
  rowKey,
}: {
  columns: ReportColumn<T>[];
  rows: T[];
  footer?: ReactNode[];
  empty?: string;
  rowKey: (row: T, index: number) => string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, i) => (
              <TableRow key={rowKey(row, i)}>
                {columns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={`${c.numeric ? "text-left font-medium tabular-nums" : ""} ${c.className ?? ""}`}
                  >
                    {c.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
          {footer && rows.length > 0 ? (
            <TableRow className="bg-primary/5 font-bold text-primary">
              {footer.map((cell, i) => (
                <TableCell key={i} className={i === 0 ? "" : "text-left tabular-nums"}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

/** يبنى جدول HTML للطباعة من نفس الأعمدة */
export function printTableHtml<T>(columns: ReportColumn<T>[], rows: T[], totals?: string[]): string {
  const head = columns.map((c) => `<th>${c.label}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map(
            (c) =>
              `<td${c.numeric ? ' style="text-align:left"' : ""}>${
                c.text ? c.text(row) : String(c.cell(row) ?? "")
              }</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  const foot = totals
    ? `<tr style="background:#eef4ef;font-weight:700">${totals
        .map((t, i) => `<td${i === 0 ? "" : ' style="text-align:left"'}>${t}</td>`)
        .join("")}</tr>`
    : "";
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}${foot}</tbody></table>`;
}
