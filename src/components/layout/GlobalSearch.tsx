import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { dateFmt, money } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { invoiceTotalsOf } from "@/lib/sales";

interface Hit {
  to: string;
  title: string;
  sub: string;
}

/** بحث شامل فى موديولات الخزينة والمبيعات */
export function GlobalSearch() {
  const data = useDb();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: Hit[] = [];

    for (const safe of data.safes) {
      if (`${safe.code} ${safe.name}`.toLowerCase().includes(q))
        out.push({ to: "/treasury/safes", title: `${safe.code} — ${safe.name}`, sub: "خزينة / حساب" });
    }
    for (const voucher of data.vouchers) {
      if (`${voucher.no} ${voucher.note} ${voucher.reference}`.toLowerCase().includes(q))
        out.push({
          to: voucher.kind === "receipt" ? "/treasury/receipts" : "/treasury/payments",
          title: `${voucher.no} — ${money(voucher.amount)}`,
          sub: `${voucher.kind === "receipt" ? "سند قبض" : "سند صرف"} — ${dateFmt(voucher.date)}`,
        });
    }
    for (const transfer of data.transfers) {
      if (`${transfer.no} ${transfer.note}`.toLowerCase().includes(q))
        out.push({ to: "/treasury/transfers", title: transfer.no, sub: "تحويل بين الخزن" });
    }
    for (const invoice of data.invoices) {
      if (invoice.no.toLowerCase().includes(q))
        out.push({
          to: "/treasury/invoices",
          title: `${invoice.no} — ${money(invoice.total)}`,
          sub: invoice.type === "sales" ? "فاتورة بيع" : "فاتورة شراء",
        });
    }
    for (const so of data.salesInvoices ?? []) {
      if (`${so.no} ${so.customerName}`.toLowerCase().includes(q))
        out.push({
          to: "/sales/invoices",
          title: `${so.no} — ${money(invoiceTotalsOf(data, so).net)}`,
          sub: `فاتورة مبيعات — ${so.customerName} — ${dateFmt(so.date)}`,
        });
    }
    for (const product of data.products ?? []) {
      if (`${product.code} ${product.name} ${product.barcode ?? ""}`.toLowerCase().includes(q))
        out.push({ to: "/sales/products", title: `${product.code} — ${product.name}`, sub: "صنف" });
    }
    for (const party of [...data.customers, ...data.suppliers]) {
      if (`${party.code} ${party.name}`.toLowerCase().includes(q))
        out.push({ to: "/sales/customers", title: party.name, sub: `${party.code} — طرف تعامل` });
    }
    return out.slice(0, 12);
  }, [data, query]);

  return (
    <div className="relative ms-auto w-full max-w-none flex-1">
      <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/60" />
      <Input
        dir="rtl"
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        placeholder="بحث شامل: سند، فاتورة، صنف، خزينة، عميل..."
        className="h-9 rounded-full border-sidebar-border/60 bg-sidebar-accent/60 pe-9 text-right text-sidebar-foreground placeholder:text-sidebar-foreground/50"
      />
      {open && results.length > 0 ? (
        <div className="absolute inset-x-0 top-11 z-40 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
          {results.map((result, index) => (
            <Link
              key={`${result.to}-${index}`}
              to={result.to}
              onClick={() => {
                setQuery("");
                setOpen(false);
              }}
              className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2 text-right text-sm last:border-0 hover:bg-primary/5"
            >
              <span className="font-medium">{result.title}</span>
              <span className="text-xs text-muted-foreground">{result.sub}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
