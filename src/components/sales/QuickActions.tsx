import {
  Barcode,
  Calculator,
  PackagePlus,
  Percent,
  PlusCircle,
  Tags,
  Truck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, num } from "@/lib/format";
import { UNIT_LABEL, orgSettings, useDb, type Product } from "@/lib/mockDb";
import { printHtml } from "@/lib/printDoc";
import { discountPercentOf, productOptions } from "@/lib/sales";
import { saveProduct, updateProductPrices } from "@/lib/salesActions";

type Panel = null | "newItem" | "prices" | "barcode" | "order" | "quick" | "code" | "calc";

interface QuickActionsProps {
  onAddProduct: (productId: string, qty?: number) => void;
  discountCode: string;
  onDiscountCode: (code: string) => void;
}

/** الشريط الجانبي للأدوات السريعة في شاشة الفاتورة */
export function QuickActions({ onAddProduct, discountCode, onDiscountCode }: QuickActionsProps) {
  const data = useDb();
  const [panel, setPanel] = useState<Panel>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const options = productOptions(data);
  const product = data.products.find((p) => p.id === productId);

  const buttons: Array<{ key: Panel; label: string; icon: React.ReactNode }> = [
    { key: "newItem", label: "إضافة صنف جديد", icon: <PackagePlus className="size-4" /> },
    { key: "prices", label: "تعديل أسعار الصنف", icon: <Tags className="size-4" /> },
    { key: "barcode", label: "طباعة باركود الصنف", icon: <Barcode className="size-4" /> },
    { key: "order", label: "عمل طلبية من الصنف", icon: <Truck className="size-4" /> },
    { key: "quick", label: "إضافة سريعة", icon: <Zap className="size-4" /> },
    { key: "code", label: "كود الخصم", icon: <Percent className="size-4" /> },
    { key: "calc", label: "الآلة الحاسبة", icon: <Calculator className="size-4" /> },
  ];

  return (
    <aside className="space-y-2 rounded-xl border border-border bg-card p-3">
      <h3 className="pb-1 text-xs font-semibold text-primary">أدوات سريعة</h3>
      {buttons.map((btn) => (
        <Button
          key={btn.label}
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 text-xs"
          onClick={() => setPanel(btn.key)}
        >
          {btn.icon}
          {btn.label}
        </Button>
      ))}

      {/* اختيار الصنف المستخدم في الأدوات */}
      <Dialog open={panel === "prices" || panel === "barcode" || panel === "order"} onOpenChange={() => setPanel(null)}>
        <DialogContent dir="rtl" className="text-right sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {panel === "prices"
                ? "تعديل أسعار الصنف"
                : panel === "barcode"
                  ? "طباعة باركود الصنف"
                  : "عمل طلبية من الصنف"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">الصنف</Label>
            <SearchSelect
              options={options}
              value={productId}
              onChange={setProductId}
              placeholder="ابحث بالاسم أو الكود أو الباركود"
            />
            {product ? (
              panel === "prices" ? (
                <PricesForm product={product} onDone={() => setPanel(null)} />
              ) : panel === "barcode" ? (
                <BarcodeForm product={product} />
              ) : (
                <OrderForm
                  product={product}
                  onDone={(qty) => {
                    onAddProduct(product.id, qty);
                    setPanel(null);
                    toast.success(`تمت إضافة ${product.name} للفاتورة`);
                  }}
                />
              )
            ) : (
              <p className="text-sm text-muted-foreground">اختر صنفاً للمتابعة</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NewItemDialog open={panel === "newItem"} onClose={() => setPanel(null)} onCreated={(id) => onAddProduct(id)} />

      {/* إضافة سريعة بالكود أو الباركود */}
      <Dialog open={panel === "quick"} onOpenChange={() => setPanel(null)}>
        <DialogContent dir="rtl" className="text-right sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة سريعة</DialogTitle>
          </DialogHeader>
          <QuickAddForm
            onAdd={(id, qty) => {
              onAddProduct(id, qty);
              setPanel(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* كود الخصم */}
      <Dialog open={panel === "code"} onOpenChange={() => setPanel(null)}>
        <DialogContent dir="rtl" className="text-right sm:max-w-md">
          <DialogHeader>
            <DialogTitle>كود الخصم</DialogTitle>
          </DialogHeader>
          <DiscountCodeForm
            current={discountCode}
            onApply={(code) => {
              onDiscountCode(code);
              setPanel(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* الآلة الحاسبة */}
      <Dialog open={panel === "calc"} onOpenChange={() => setPanel(null)}>
        <DialogContent dir="rtl" className="text-right sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>الآلة الحاسبة</DialogTitle>
          </DialogHeader>
          <MiniCalculator />
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function PricesForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const [unitPrice, setUnitPrice] = useState(String(product.unitPrice));
  const [wholesalePrice, setWholesalePrice] = useState(String(product.wholesalePrice));
  const [cost, setCost] = useState(String(product.cost));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">سعر البيع</Label>
          <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">سعر الجملة</Label>
          <Input type="number" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">التكلفة</Label>
          <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          onClick={() => {
            const res = updateProductPrices(product.id, {
              unitPrice: Number(unitPrice),
              wholesalePrice: Number(wholesalePrice),
              cost: Number(cost),
            });
            if (!res.ok) toast.error(res.error ?? "خطأ");
            else {
              toast.success("تم تحديث الأسعار");
              onDone();
            }
          }}
        >
          حفظ الأسعار
        </Button>
      </DialogFooter>
    </div>
  );
}

function BarcodeForm({ product }: { product: Product }) {
  const [count, setCount] = useState("6");

  const doPrint = () => {
    const labels = Array.from({ length: Math.max(1, Number(count) || 1) })
      .map(
        () => `<div style="border:1px dashed #98a89d;padding:10px;text-align:center;width:31%;display:inline-block;margin:4px">
        <div style="font-size:12px;font-weight:600">${product.name}</div>
        <div style="font-family:monospace;font-size:22px;letter-spacing:2px">||| ||| || |||| |</div>
        <div style="font-size:12px">${product.barcode || product.code}</div>
        <div style="font-size:12px">${money(product.unitPrice)} / ${UNIT_LABEL[product.unit]}</div>
      </div>`,
      )
      .join("");
    printHtml(`باركود ${product.name}`, `<h1>ملصقات باركود — ${product.name}</h1><div>${labels}</div>`);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">عدد الملصقات</Label>
        <Input type="number" value={count} onChange={(e) => setCount(e.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">
        الكود: {product.code} — الباركود: {product.barcode || "-"} — السريال: {product.serial || "-"}
      </p>
      <DialogFooter>
        <Button type="button" onClick={doPrint} className="gap-1.5">
          <Barcode className="size-4" />
          طباعة
        </Button>
      </DialogFooter>
    </div>
  );
}

function OrderForm({ product, onDone }: { product: Product; onDone: (qty: number) => void }) {
  const [qty, setQty] = useState("1");
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        المتاح بالمخزون: {num(product.stock)} {UNIT_LABEL[product.unit]} — السعر: {money(product.unitPrice)}
      </p>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">الكمية المطلوبة</Label>
        <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
      </div>
      <DialogFooter>
        <Button type="button" onClick={() => onDone(Math.max(1, Number(qty) || 1))}>
          إضافة للفاتورة
        </Button>
      </DialogFooter>
    </div>
  );
}

function QuickAddForm({ onAdd }: { onAdd: (productId: string, qty: number) => void }) {
  const data = useDb();
  const [term, setTerm] = useState("");
  const [qty, setQty] = useState("1");

  const matches = data.products
    .filter((p) => {
      const q = term.trim().toLowerCase();
      if (!q) return false;
      return (
        p.code.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.serial.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
      );
    })
    .slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">الكود / الباركود / السريال / الاسم</Label>
          <Input dir="rtl" value={term} onChange={(e) => setTerm(e.target.value)} autoFocus />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">الكمية</Label>
          <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        {matches.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onAdd(p.id, Math.max(1, Number(qty) || 1))}
            className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-right text-sm hover:border-primary/40 hover:bg-primary/5"
          >
            <span>{p.name}</span>
            <span className="text-xs text-muted-foreground">
              {p.code} — {money(p.unitPrice)}
            </span>
          </button>
        ))}
        {term && matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد نتائج</p>
        ) : null}
      </div>
    </div>
  );
}

function DiscountCodeForm({ current, onApply }: { current: string; onApply: (code: string) => void }) {
  const data = useDb();
  const [code, setCode] = useState(current);
  const percent = discountPercentOf(data, code);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">الكود</Label>
        <Input dir="rtl" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      </div>
      <p className="text-xs text-muted-foreground">
        {code
          ? percent > 0
            ? `كود صحيح — خصم ${percent}% على صافي الفاتورة`
            : "كود غير صحيح أو غير مُفعّل"
          : `الأكواد المتاحة: ${data.discountCodes.filter((d) => d.active).map((d) => d.code).join(", ")}`}
      </p>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={() => onApply("")}>
          إزالة الكود
        </Button>
        <Button type="button" disabled={percent === 0} onClick={() => onApply(code)}>
          تطبيق الخصم
        </Button>
      </DialogFooter>
    </div>
  );
}

function MiniCalculator() {
  const [expr, setExpr] = useState("");
  const keys = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+"];

  const compute = () => {
    try {
      const clean = expr.replace(/[^0-9+\-*/.() ]/g, "");
      // eslint-disable-next-line no-new-func
      const value = Number(new Function(`return (${clean || 0})`)());
      setExpr(Number.isFinite(value) ? String(Number(value.toFixed(4))) : "خطأ");
    } catch {
      setExpr("خطأ");
    }
  };

  return (
    <div className="space-y-2">
      <Input dir="ltr" className="text-left text-lg font-semibold" value={expr} onChange={(e) => setExpr(e.target.value)} />
      <div className="grid grid-cols-4 gap-1.5">
        {keys.map((k) => (
          <Button
            key={k}
            type="button"
            variant={k === "=" ? "default" : "outline"}
            onClick={() => (k === "=" ? compute() : setExpr((v) => v + k))}
          >
            {k}
          </Button>
        ))}
        <Button type="button" variant="ghost" className="col-span-4" onClick={() => setExpr("")}>
          مسح
        </Button>
      </div>
    </div>
  );
}

function NewItemDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    barcode: "",
    unit: "ton",
    unitPrice: "",
    cost: "",
    stock: "",
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="text-right sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>إضافة صنف جديد</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">كود الصنف</Label>
            <Input dir="rtl" value={form.code} onChange={(e) => set("code", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">اسم الصنف</Label>
            <Input dir="rtl" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">الباركود</Label>
            <Input dir="rtl" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">وحدة القياس</Label>
            <SearchSelect
              options={Object.entries(UNIT_LABEL).map(([value, label]) => ({ value, label }))}
              value={form.unit}
              onChange={(v) => set("unit", v)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">سعر البيع</Label>
            <Input type="number" value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">التكلفة</Label>
            <Input type="number" value={form.cost} onChange={(e) => set("cost", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">الرصيد الافتتاحي</Label>
            <Input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            className="gap-1.5"
            onClick={() => {
              const res = saveProduct({
                code: form.code,
                name: form.name,
                barcode: form.barcode,
                serial: "",
                unit: form.unit as Product["unit"],
                unitPrice: Number(form.unitPrice || 0),
                wholesalePrice: Number(form.unitPrice || 0),
                cost: Number(form.cost || 0),
                taxRate: orgSettings().vatRate,
                category: "",
                stock: Number(form.stock || 0),
                minStock: 0,
                active: true,
              });
              if (!res.ok || !res.id) {
                toast.error(res.error ?? "تعذر الحفظ");
                return;
              }
              toast.success("تم إضافة الصنف");
              onCreated(res.id);
              onClose();
            }}
          >
            <PlusCircle className="size-4" />
            حفظ وإضافة للفاتورة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
