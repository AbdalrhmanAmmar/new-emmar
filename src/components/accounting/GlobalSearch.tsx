import { useNavigate } from "@tanstack/react-router";
import { FileText, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { accountingNav } from "@/lib/accountingNav";
import { getTable } from "@/lib/mockDb";

/** الجداول التي يشملها البحث الشامل مع حقول العرض ومسار الصفحة. */
const SOURCES: { table: string; label: string; path: string; fields: string[] }[] = [
  { table: "acc_sales_invoices", label: "فاتورة بيع", path: "/accounting/sales-billing", fields: ["invoice_number", "buyer_name", "so_no", "do_no", "total"] },
  { table: "acc_vendor_bills", label: "فاتورة مورد", path: "/accounting/vendor-bills", fields: ["bill_no", "vendor_name", "vendor_ref", "total"] },
  { table: "acc_sales_orders", label: "أمر بيع", path: "/accounting/sales-orders", fields: ["so_no", "customer_name", "total"] },
  { table: "acc_sales_quotations", label: "عرض سعر", path: "/accounting/sales-quotations", fields: ["quote_no", "customer_name", "total"] },
  { table: "acc_deliveries", label: "إذن تسليم", path: "/accounting/deliveries", fields: ["do_no", "customer_name", "so_no"] },
  { table: "acc_purchase_orders", label: "أمر شراء", path: "/accounting/purchase-orders", fields: ["po_no", "vendor_name", "total"] },
  { table: "acc_goods_receipts", label: "إذن استلام", path: "/accounting/goods-receipts", fields: ["grn_no", "vendor_name", "po_no"] },
  { table: "acc_rfqs", label: "طلب عرض سعر", path: "/accounting/rfqs", fields: ["rfq_no", "subject"] },
  { table: "acc_stock_moves", label: "حركة مخزون", path: "/accounting/stock-moves", fields: ["move_no", "item_name", "warehouse_code", "move_type"] },
  { table: "acc_payments", label: "سند دفع/تحصيل", path: "/accounting/payments", fields: ["payment_no", "party_name", "amount"] },
  { table: "acc_cheques", label: "شيك", path: "/accounting/cheques", fields: ["cheque_no", "party_name", "amount"] },
  { table: "acc_journal_entries", label: "قيد يومية", path: "/accounting/journal-entries", fields: ["entry_no", "journal_no", "description", "ref_no"] },
  { table: "acc_customers", label: "عميل", path: "/accounting/customers", fields: ["code", "name_ar", "phone"] },
  { table: "acc_vendors", label: "مورد", path: "/accounting/vendors", fields: ["code", "name_ar", "phone"] },
  { table: "acc_items", label: "صنف", path: "/accounting/items", fields: ["code", "name_ar", "category"] },
  { table: "acc_chart_of_accounts", label: "حساب", path: "/accounting/chart-of-accounts", fields: ["code", "name_ar"] },
  { table: "acc_fixed_assets", label: "أصل ثابت", path: "/accounting/fixed-assets", fields: ["asset_code", "name_ar"] },
  { table: "acc_credit_debit_notes", label: "إشعار", path: "/accounting/credit-debit-notes", fields: ["note_number", "party_name", "total"] },
];

type Hit = { key: string; kind: string; title: string; subtitle: string; path: string };

export function GlobalSearch({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
    else {
      setQ("");
      setActive(0);
    }
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const out: Hit[] = [];

    // الشاشات
    for (const g of accountingNav) {
      for (const it of g.items) {
        if (`${it.label} ${g.title} ${it.path}`.toLowerCase().includes(term)) {
          out.push({ key: `nav-${it.path}`, kind: "شاشة", title: it.label, subtitle: g.title, path: it.path });
        }
      }
    }

    // المستندات والبيانات
    for (const src of SOURCES) {
      let rows: any[] = [];
      try {
        rows = getTable(src.table);
      } catch {
        rows = [];
      }
      for (const r of rows) {
        const hay = src.fields.map((f) => r?.[f]).filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) continue;
        const title = String(r?.[src.fields[0]] ?? "—");
        const subtitle = src.fields
          .slice(1)
          .map((f) => r?.[f])
          .filter(Boolean)
          .slice(0, 2)
          .join(" — ");
        out.push({ key: `${src.table}-${r.id ?? title}`, kind: src.label, title, subtitle, path: src.path });
        if (out.length > 120) break;
      }
      if (out.length > 120) break;
    }
    return out.slice(0, 60);
  }, [q]);

  const go = (hit?: Hit) => {
    const target = hit ?? hits[active];
    if (!target) return;
    setOpen(false);
    navigate({ to: target.path });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="بحث شامل (Ctrl + K)"
        className={`flex h-10 w-full items-center gap-2.5 rounded-full border border-white/10 bg-white/10 px-4 text-sidebar-foreground/75 shadow-inner backdrop-blur transition-all hover:bg-white/15 hover:shadow-md ${className}`}
      >
        <Search className="h-4 w-4 shrink-0 opacity-70" />
        <span className="flex-1 truncate text-start text-xs md:text-[13px]">بحث شامل…</span>
        <kbd className="hidden shrink-0 rounded-md border border-white/20 bg-white/5 px-1.5 py-0.5 font-sans text-[10px] lg:inline">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          dir="rtl"
          className="top-[18%] max-w-2xl translate-y-0 gap-0 overflow-hidden rounded-2xl border-white/20 bg-card/95 p-0 shadow-2xl backdrop-blur-xl"
          aria-describedby={undefined}
        >
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              dir="rtl"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(hits.length - 1, i + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(0, i - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  go();
                }
              }}
              placeholder="ابحث عن فاتورة، إذن، عميل، صنف، قيد، شاشة…"
              className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">Esc للإغلاق</span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!q.trim() ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                اكتب كلمة للبحث في كل مستندات وبيانات البرنامج
              </p>
            ) : hits.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">لا نتائج مطابقة</p>
            ) : (
              hits.map((h, i) => (
                <button
                  key={h.key}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(h)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right transition-colors ${
                    i === active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <FileText className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{h.title}</span>
                    {h.subtitle && (
                      <span className={`block truncate text-xs ${i === active ? "opacity-80" : "text-muted-foreground"}`}>
                        {h.subtitle}
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      i === active ? "bg-white/20" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {h.kind}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default GlobalSearch;
