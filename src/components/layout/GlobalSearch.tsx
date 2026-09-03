import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { MODULES } from "@/components/layout/navConfig";
import { Input } from "@/components/ui/input";
import { dateFmt, money } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { invoiceTotalsOf } from "@/lib/sales";
import { hasPerm, screenForPath, useCurrentUser } from "@/lib/session";

interface Hit {
  to: string;
  title: string;
  sub: string;
  group: string;
}

/** بحث شامل: صفحات البرنامج + كل السجلات (خزينة، مبيعات، مشتريات، مخازن، موظفين، مصروفات، مستخدمين) */
export function GlobalSearch() {
  const data = useDb();
  const current = useCurrentUser();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const allowed = (path: string) => {
    const screen = screenForPath(path);
    return !screen || hasPerm(current, screen, "view");
  };

  const results = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const hit = (h: Hit) => {
      if (allowed(h.to)) out.push(h);
    };
    const out: Hit[] = [];
    const match = (...parts: (string | number | null | undefined)[]) =>
      parts
        .map((p) => String(p ?? ""))
        .join(" ")
        .toLowerCase()
        .includes(q);

    // 1) صفحات البرنامج
    for (const module of MODULES) {
      if (match(module.label, module.home.label))
        hit({ to: module.home.to, title: module.home.label, sub: module.label, group: "صفحات" });
      for (const group of module.groups) {
        for (const item of group.items) {
          if (match(item.label, group.label, module.label))
            hit({ to: item.to, title: item.label, sub: `${module.label} › ${group.label}`, group: "صفحات" });
        }
      }
    }

    // 2) الخزينة
    for (const safe of data.safes) {
      if (match(safe.code, safe.name))
        hit({ to: "/treasury/safes", title: `${safe.code} — ${safe.name}`, sub: "خزينة / حساب", group: "الخزينة" });
    }
    for (const voucher of data.vouchers) {
      if (match(voucher.no, voucher.note, voucher.reference, voucher.amount))
        hit({
          to: voucher.kind === "receipt" ? "/treasury/receipts" : "/treasury/payments",
          title: `${voucher.no} — ${money(voucher.amount)}`,
          sub: `${voucher.kind === "receipt" ? "سند قبض" : "سند صرف"} — ${dateFmt(voucher.date)}`,
          group: "الخزينة",
        });
    }
    for (const transfer of data.transfers) {
      if (match(transfer.no, transfer.note))
        hit({ to: "/treasury/transfers", title: transfer.no, sub: "تحويل بين الخزن", group: "الخزينة" });
    }

    // 3) المبيعات
    for (const so of data.salesInvoices ?? []) {
      if (match(so.no, so.customerName))
        hit({
          to: "/sales/invoices",
          title: `${so.no} — ${money(invoiceTotalsOf(data, so).total)}`,
          sub: `فاتورة مبيعات — ${so.customerName} — ${dateFmt(so.date)}`,
          group: "المبيعات",
        });
    }
    for (const customer of data.customers) {
      if (match(customer.code, customer.name, customer.phone))
        hit({ to: "/sales/customers", title: customer.name, sub: `${customer.code} — عميل`, group: "المبيعات" });
    }

    // 4) المشتريات
    for (const pi of data.purchaseInvoices ?? []) {
      if (match(pi.no, pi.supplierName))
        hit({
          to: "/purchases/invoices",
          title: pi.no,
          sub: `فاتورة مشتريات — ${pi.supplierName} — ${dateFmt(pi.date)}`,
          group: "المشتريات",
        });
    }
    for (const supplier of data.suppliers) {
      if (match(supplier.code, supplier.name, supplier.phone))
        hit({ to: "/purchases/suppliers", title: supplier.name, sub: `${supplier.code} — مورد`, group: "المشتريات" });
    }

    // 5) الأصناف والمخازن
    for (const product of data.products ?? []) {
      if (match(product.code, product.name, product.barcode, product.serial, product.category))
        hit({ to: "/sales/products", title: `${product.code} — ${product.name}`, sub: "صنف", group: "الأصناف والمخازن" });
    }
    for (const warehouse of data.warehouses ?? []) {
      if (match(warehouse.code, warehouse.name))
        hit({
          to: "/inventory/warehouses",
          title: `${warehouse.code} — ${warehouse.name}`,
          sub: "مخزن",
          group: "الأصناف والمخازن",
        });
    }
    for (const move of data.stockMoves ?? []) {
      if (match(move.no, move.reference, move.note))
        hit({
          to: "/inventory/moves",
          title: move.no,
          sub: `حركة مخزنية — ${dateFmt(move.date)}`,
          group: "الأصناف والمخازن",
        });
    }
    for (const doc of data.returns ?? []) {
      if (match(doc.no, doc.partyName, doc.note))
        hit({
          to: doc.kind === "purchase" ? "/purchases/returns" : "/sales/returns",
          title: doc.no,
          sub: `مرتجع — ${doc.partyName ?? ""} — ${dateFmt(doc.date)}`,
          group: "الأصناف والمخازن",
        });
    }

    // 6) المصروفات والموظفين والمستخدمين
    for (const expense of data.expenses ?? []) {
      if (match(expense.no, expense.note, expense.itemName, expense.beneficiary))
        hit({
          to: "/expenses/list",
          title: `${expense.no} — ${money(expense.amount)}`,
          sub: `مصروف — ${expense.itemName ?? ""} — ${dateFmt(expense.date)}`,
          group: "المصروفات والموظفين",
        });
    }
    for (const employee of data.employees ?? []) {
      if (match(employee.code, employee.name, employee.job, employee.phone))
        hit({
          to: "/hr/employees",
          title: `${employee.code} — ${employee.name}`,
          sub: employee.job ?? "موظف",
          group: "المصروفات والموظفين",
        });
    }
    for (const user of data.users ?? []) {
      if (match(user.username, user.fullName))
        hit({ to: "/users/list", title: user.fullName || user.username, sub: "مستخدم", group: "المصروفات والموظفين" });
    }

    return out.slice(0, 24);
  }, [data, query, current]);

  useEffect(() => setCursor(0), [query]);

  const go = (to: string) => {
    setQuery("");
    setOpen(false);
    navigate({ to });
  };

  return (
    <div className="relative ms-auto w-full max-w-none flex-1">
      <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/60" />
      <Input
        ref={inputRef}
        dir="rtl"
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!results.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setCursor((c) => (c + 1) % results.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setCursor((c) => (c - 1 + results.length) % results.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            const target = results[cursor];
            if (target) go(target.to);
          }
        }}
        placeholder="بحث شامل (Ctrl+K): صفحة، سند، فاتورة، صنف، مخزن، عميل، مورد، موظف..."
        className="h-9 rounded-full border-sidebar-border/60 bg-sidebar-accent/60 pe-9 text-right text-sidebar-foreground placeholder:text-sidebar-foreground/50"
      />
      {open && query.trim().length >= 2 ? (
        <div className="absolute inset-x-0 top-11 z-40 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">لا توجد نتائج مطابقة</p>
          ) : (
            results.map((result, index) => {
              const prev = results[index - 1];
              return (
                <div key={`${result.to}-${index}`}>
                  {prev?.group !== result.group ? (
                    <p className="bg-muted/60 px-3 py-1 text-[11px] font-bold text-muted-foreground">{result.group}</p>
                  ) : null}
                  <Link
                    to={result.to}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => {
                      setQuery("");
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2 text-right text-sm last:border-0 ${
                      index === cursor ? "bg-primary/10" : "hover:bg-primary/5"
                    }`}
                  >
                    <span className="truncate font-medium">{result.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{result.sub}</span>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
