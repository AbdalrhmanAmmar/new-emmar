import { Banknote, CreditCard, Minus, Plus, Printer, Search, Trash2, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, num, today } from "@/lib/format";
import { UNIT_LABEL, nextNo, uid, useDb, type Product, type SalesLine, type SalesPayMethod } from "@/lib/mockDb";
import { invoicePrintInput, printSalesInvoice } from "@/lib/printInvoice";
import { discountPercentOf, invoiceTotals, lineTotals } from "@/lib/sales";
import { saveSalesInvoice } from "@/lib/salesActions";
import { cn } from "@/lib/utils";

/** شاشة الكاشير — بيع سريع بنمط نقاط البيع (مطاعم/محلات) */
export function PosCashier() {
  const data = useDb();

  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [lines, setLines] = useState<SalesLine[]>([]);
  const [payMethod, setPayMethod] = useState<SalesPayMethod>("cash");
  const [payInput, setPayInput] = useState("");
  const [customerKind, setCustomerKind] = useState<"cash" | "registered">("cash");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState(data.branches[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState(data.warehouses[0]?.id ?? "");
  const [safeId, setSafeId] = useState<string | null>(data.safes[0]?.id ?? null);
  const [discountCode, setDiscountCode] = useState("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of data.products) if (p.active && p.category) set.add(p.category);
    return ["all", ...Array.from(set)];
  }, [data.products]);

  const products = useMemo(() => {
    const q = term.trim().toLowerCase();
    return data.products.filter((p) => {
      if (!p.active) return false;
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q)
      );
    });
  }, [data.products, term, category]);

  const codePercent = discountPercentOf(data, discountCode);
  const payAmount = Number(payInput || 0);
  const totals = invoiceTotals({
    lines,
    payMethod,
    payCash: payMethod === "card" ? 0 : payAmount,
    payCard: payMethod === "card" ? payAmount : 0,
    codePercent,
  });

  const invoiceNo = useMemo(
    () => nextNo("SO", data.salesInvoices.map((i) => i.no)),
    [data.salesInvoices],
  );

  const addProduct = (product: Product) => {
    setLines((rows) => {
      const found = rows.find((l) => l.productId === product.id);
      if (found) return rows.map((l) => (l.id === found.id ? { ...l, qty: Number(l.qty) + 1 } : l));
      return [
        ...rows,
        {
          id: uid("sl"),
          productId: product.id,
          code: product.code,
          name: product.name,
          qty: 1,
          unit: product.unit,
          price: product.unitPrice,
          discountPct: 0,
          discountAmt: 0,
          taxRate: product.taxRate,
        },
      ];
    });
  };

  const setQty = (id: string, qty: number) =>
    setLines((rows) =>
      rows.flatMap((l) => (l.id === id ? (qty > 0 ? [{ ...l, qty }] : []) : [l])),
    );

  const setPrice = (id: string, price: number) =>
    setLines((rows) => rows.map((l) => (l.id === id ? { ...l, price } : l)));

  const clearCart = () => {
    setLines([]);
    setPayInput("");
    setDiscountCode("");
    setCustomerKind("cash");
    setCustomerId(null);
  };

  const payload = (status: "draft" | "posted") => ({
    date: today(),
    dueDate: today(),
    view: "professional" as const,
    branchId,
    warehouseId,
    repId: data.reps[0]?.id ?? null,
    userId: data.users[0]?.id ?? "u1",
    customerId: customerKind === "registered" ? customerId : null,
    customerName: customerKind === "registered" ? "" : "عميل نقدي",
    lines,
    payMethod,
    payCash: payMethod === "card" ? 0 : payMethod === "credit" ? 0 : payAmount,
    payCard: payMethod === "card" ? payAmount : 0,
    safeId: payMethod === "credit" ? null : safeId,
    discountCode,
    note: "بيع كاشير",
    status,
  });

  const doPrint = () => {
    printSalesInvoice(
      invoicePrintInput(
        data,
        {
          no: invoiceNo,
          date: today(),
          dueDate: today(),
          branchId,
          warehouseId,
          repId: data.reps[0]?.id ?? null,
          customerId: customerKind === "registered" ? customerId : null,
          customerName: customerKind === "registered" ? "" : "عميل نقدي",
          lines,
          payMethod,
          discountCode,
          note: "بيع كاشير",
          status: "posted",
        },
        totals,
      ),
    );
  };

  const checkout = (andPrint: boolean) => {
    if (lines.length === 0) {
      toast.error("أضف صنفاً واحداً على الأقل");
      return;
    }
    if (payMethod !== "credit" && payAmount < totals.total - 0.01) {
      toast.error("المبلغ المدفوع أقل من الإجمالي");
      return;
    }
    const res = saveSalesInvoice(payload("posted"));
    if (!res.ok) {
      toast.error(res.error ?? "تعذر إتمام البيع");
      return;
    }
    toast.success(`تم إتمام الفاتورة ${invoiceNo}`);
    if (andPrint) doPrint();
    clearCart();
  };

  const change = payMethod === "credit" ? 0 : Math.max(0, payAmount - totals.total);

  return (
    <div className="form-page-enter grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      {/* شبكة الأصناف */}
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              dir="rtl"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="ابحث بالاسم أو الكود أو الباركود…"
              className="pe-9"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  category === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {c === "all" ? "كل الأصناف" : c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addProduct(p)}
              className="group flex flex-col justify-between gap-2 rounded-xl border border-border bg-card p-3 text-right transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <span className="text-sm font-bold text-foreground">{p.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {p.code} • متاح {num(p.stock)} {UNIT_LABEL[p.unit]}
              </span>
              <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                {money(p.unitPrice)}
              </span>
            </button>
          ))}
          {products.length === 0 ? (
            <p className="col-span-full rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              لا توجد أصناف مطابقة
            </p>
          ) : null}
        </div>
      </div>

      {/* سلة البيع */}
      <aside className="flex h-fit flex-col gap-3 rounded-xl border border-border bg-card p-3 xl:sticky xl:top-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">فاتورة {invoiceNo}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={clearCart} className="gap-1 text-destructive">
            <X className="size-4" /> تفريغ
          </Button>
        </div>

        <div className="flex gap-1.5">
          {(["cash", "registered"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setCustomerKind(k)}
              className={cn(
                "flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                customerKind === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
              )}
            >
              {k === "cash" ? "عميل نقدي" : "عميل مسجل"}
            </button>
          ))}
        </div>
        {customerKind === "registered" ? (
          <SearchSelect
            value={customerId}
            onChange={(v) => setCustomerId(v || null)}
            options={data.customers.map((c) => ({ value: c.id, label: c.name, hint: `${c.code} — ${c.phone}` }))}
            placeholder="اختر العميل"
          />
        ) : null}

        <div className="max-h-[46vh] space-y-2 overflow-y-auto">
          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              اضغط على أى صنف لإضافته للفاتورة
            </p>
          ) : (
            lines.map((l) => {
              const t = lineTotals(l);
              return (
                <div key={l.id} className="rounded-lg border border-border/70 bg-background p-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-semibold text-foreground">{l.name}</span>
                    <button type="button" onClick={() => setQty(l.id, 0)} className="text-destructive">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="outline" className="size-7" onClick={() => setQty(l.id, Number(l.qty) - 1)}>
                        <Minus className="size-3.5" />
                      </Button>
                      <Input
                        value={String(l.qty)}
                        onChange={(e) => setQty(l.id, Number(e.target.value || 0))}
                        className="h-7 w-14 text-center text-xs"
                      />
                      <Button type="button" size="icon" variant="outline" className="size-7" onClick={() => setQty(l.id, Number(l.qty) + 1)}>
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                    <Input
                      value={String(l.price)}
                      onChange={(e) => setPrice(l.id, Number(e.target.value || 0))}
                      className="h-7 w-24 text-center text-xs"
                    />
                    <span className="text-xs font-bold text-primary">{money(t.total)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-1.5 rounded-lg bg-muted/50 p-2.5 text-xs">
          <Row label="الإجمالي قبل الخصم" value={money(totals.gross)} />
          <Row label="الخصم" value={money(totals.discount)} />
          <Row label="الضريبة" value={money(totals.tax)} />
          <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-bold text-primary">
            <span>الإجمالي المستحق</span>
            <span>{money(totals.total)}</span>
          </div>
        </div>

        <Input dir="rtl" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="كود خصم (اختياري)" className="h-8 text-xs" />

        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { k: "cash", label: "نقدي", icon: <Banknote className="size-3.5" /> },
              { k: "card", label: "شبكة", icon: <CreditCard className="size-3.5" /> },
              { k: "credit", label: "آجل", icon: <UserRound className="size-3.5" /> },
            ] as const
          ).map((m) => (
            <button
              key={m.k}
              type="button"
              onClick={() => setPayMethod(m.k)}
              className={cn(
                "flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
                payMethod === m.k ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
              )}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>

        {payMethod !== "credit" ? (
          <>
            <Input
              value={payInput}
              onChange={(e) => setPayInput(e.target.value)}
              placeholder="المبلغ المدفوع"
              className="h-9 text-center font-bold"
            />
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPayInput(String(Math.round(totals.total * 100) / 100))}>
                المبلغ بالكامل
              </Button>
              {[50, 100, 200, 500].map((v) => (
                <Button key={v} type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPayInput(String(payAmount + v))}>
                  +{v}
                </Button>
              ))}
            </div>
            <Row label="المتبقي للعميل (الباقي)" value={money(change)} />
          </>
        ) : (
          <p className="rounded-lg bg-amber-500/10 p-2 text-[11px] font-semibold text-amber-700">
            البيع الآجل يتطلب اختيار عميل مسجل — سيُسجل الرصيد على حسابه.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={() => checkout(false)} className="h-10 font-bold">
            إتمام البيع
          </Button>
          <Button type="button" variant="outline" onClick={() => checkout(true)} className="h-10 gap-1.5 font-bold">
            <Printer className="size-4" /> بيع وطباعة
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border pt-2">
          <SearchSelect
            value={branchId}
            onChange={(v) => setBranchId(v)}
            options={data.branches.map((b) => ({ value: b.id, label: b.name }))}
            placeholder="الفرع"
          />
          <SearchSelect
            value={warehouseId}
            onChange={(v) => setWarehouseId(v)}
            options={data.warehouses.map((w) => ({ value: w.id, label: w.name }))}
            placeholder="المخزن"
          />
          {payMethod !== "credit" ? (
            <div className="col-span-2">
              <SearchSelect
                value={safeId}
                onChange={(v) => setSafeId(v || null)}
                options={data.safes.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="الخزينة"
              />
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
