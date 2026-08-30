import { UNIT_LABEL, type Product, type ProductUnit, type SalesLine } from "@/lib/mockDb";

/** وحدة قابلة للاختيار فى الفواتير */
export interface UsableUnit {
  code: string;
  name: string;
  /** عدد الوحدات الأساسية داخل هذه الوحدة */
  factor: number;
  price: number;
  wholesalePrice: number;
  isBase: boolean;
}

/** الوحدة الأساسية للصنف (المخزون يُحفظ بها دائماً) */
export function baseUnit(product: Product): UsableUnit {
  return {
    code: product.unit,
    name: UNIT_LABEL[product.unit],
    factor: 1,
    price: Number(product.unitPrice || 0),
    wholesalePrice: Number(product.wholesalePrice || 0),
    isBase: true,
  };
}

/** كل الوحدات المتاحة للصنف = الأساسية + وحدات التحويل */
export function productUnits(product: Product): UsableUnit[] {
  const extra = (product.units ?? [])
    .filter((u) => u.code?.trim() && Number(u.factor) > 0)
    .map<UsableUnit>((u) => ({
      code: u.code,
      name: u.name?.trim() || u.code,
      factor: Number(u.factor),
      price: Number(u.price || 0),
      wholesalePrice: Number(u.wholesalePrice ?? u.price ?? 0),
      isBase: false,
    }));
  return [baseUnit(product), ...extra];
}

/** إيجاد وحدة بالكود مع الرجوع للوحدة الأساسية */
export function findUnit(product: Product, code?: string | null): UsableUnit {
  const list = productUnits(product);
  return list.find((u) => u.code === code) ?? list[0]!;
}

/** معامل التحويل المستخدم فى سطر الفاتورة */
export function lineFactor(line: Pick<SalesLine, "unitFactor">): number {
  const f = Number(line.unitFactor);
  return Number.isFinite(f) && f > 0 ? f : 1;
}

/** الكمية بالوحدة الأساسية للمخزون */
export function baseQty(line: Pick<SalesLine, "qty" | "unitFactor">): number {
  return Number(line.qty || 0) * lineFactor(line);
}

/** مسمى وحدة السطر للعرض والطباعة */
export function lineUnitLabel(line: Pick<SalesLine, "unit" | "unitName">): string {
  return line.unitName?.trim() || UNIT_LABEL[line.unit] || String(line.unit);
}

/** الرصيد المتاح معروضاً بوحدة معينة */
export function stockInUnit(product: Product, code?: string | null): number {
  const unit = findUnit(product, code);
  return Number(product.stock || 0) / (unit.factor || 1);
}

/** حقول الوحدة الجاهزة للدمج فى سطر الفاتورة */
export function unitPatch(product: Product, code?: string | null) {
  const unit = findUnit(product, code);
  return { unitCode: unit.code, unitName: unit.name, unitFactor: unit.factor, price: unit.price };
}

/** خيارات الوحدات لقائمة منسدلة */
export function unitOptions(product: Product) {
  return productUnits(product).map((u) => ({
    value: u.code,
    label: u.name,
    hint: u.isBase ? "الوحدة الأساسية" : `1 ${u.name} = ${u.factor} ${UNIT_LABEL[product.unit]}`,
  }));
}

export function emptyProductUnit(id: string): ProductUnit {
  return { id, code: "", name: "", factor: 1, price: 0, wholesalePrice: 0 };
}
