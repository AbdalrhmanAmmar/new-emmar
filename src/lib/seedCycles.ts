/**
 * Demo seed for the full purchase (Procure-to-Pay) and sales (Order-to-Cash)
 * cycles, so every stage of both cycles already has realistic Egyptian data
 * on first run: RFQ → PO → GRN → Vendor bill → Payment, and
 * Quotation → Sales order → Delivery → Invoice → Collection.
 */
import { uid, type Row, type Tables } from "@/lib/mockDb";
import { DEFAULT_SETTINGS } from "@/lib/docFlow";

type Item = { id: string; code: string; name_ar: string; cost_price: number; sale_price: number; vat_applicable: boolean };
type Wh = { id: string; name_ar: string };

const r2 = (v: number) => Math.round(v * 100) / 100;

export function buildCycles(input: {
  items: Item[];
  warehouses: Wh[];
  customers: Row[];
  vendors: Row[];
  d: (m: number, day: number) => string;
  today: () => string;
}): { tables: Tables; stockMoves: Row[] } {
  const { items, warehouses, customers, vendors, d, today } = input;
  const wh = warehouses[0];
  const wh2 = warehouses[1];
  const corn = items.find((i) => i.code === "FD-1001")!;
  const soy = items.find((i) => i.code === "FD-1002")!;
  const bran = items.find((i) => i.code === "FD-1003")!;
  const broiler = items.find((i) => i.code === "FD-2001")!;
  const dairy = items.find((i) => i.code === "FD-3001")!;
  const vendorA = vendors[0];
  const vendorB = vendors[1];
  const freightVendor = vendors[2];
  const custA = customers[0];
  const custB = customers[1];

  const stockMoves: Row[] = [];
  const moveSeq = { n: 900 };
  const addMove = (
    item: Item, type: "in" | "out", quantity_kg: number, unit_cost: number,
    date: string, ref_type: string, ref_no: string, warehouse: Wh,
  ) => {
    stockMoves.push({
      id: uid(),
      move_no: `${type === "in" ? "IN" : "OUT"}-${String(moveSeq.n++).padStart(5, "0")}`,
      move_date: date,
      move_type: type,
      item_id: item.id,
      item_code: item.code,
      item_name: item.name_ar,
      warehouse_id: warehouse.id,
      warehouse_name: warehouse.name_ar,
      quantity_kg,
      unit_cost,
      total_cost: r2(quantity_kg * unit_cost),
      batch_no: `B-${ref_no}`,
      ref_type,
      ref_no,
      notes: null,
    });
  };

  /* ===================== دورة المشتريات ===================== */

  // --- RFQ مُرسّى منه أمر شراء
  const rfq1 = {
    id: uid(), rfq_no: "RFQ-0001", rfq_date: d(3, 1), deadline_date: d(3, 5),
    warehouse_id: wh.id, warehouse_name: wh.name_ar, status: "selected",
    notes: "توريد 200 طن ذرة صفراء — تسليم أرض المخزن",
  };
  const rfq2 = {
    id: uid(), rfq_no: "RFQ-0002", rfq_date: d(3, 14), deadline_date: d(3, 20),
    warehouse_id: wh2.id, warehouse_name: wh2.name_ar, status: "sent",
    notes: "كسب صويا 46% — عروض مطلوبة من ٣ موردين",
  };
  const acc_rfqs = [rfq1, rfq2];

  const acc_rfq_lines: Row[] = [
    { id: uid(), rfq_id: rfq1.id, rfq_no: rfq1.rfq_no, line_no: 1, item_id: corn.id, item_code: corn.code, item_name: corn.name_ar, quantity_kg: 200000, unit: "كجم", target_price: 12.4 },
    { id: uid(), rfq_id: rfq2.id, rfq_no: rfq2.rfq_no, line_no: 1, item_id: soy.id, item_code: soy.code, item_name: soy.name_ar, quantity_kg: 120000, unit: "كجم", target_price: 23.8 },
  ];

  const acc_rfq_quotes: Row[] = [
    { id: uid(), rfq_id: rfq1.id, rfq_no: rfq1.rfq_no, vendor_id: vendorB.id, vendor_name: vendorB.name_ar, quote_date: d(3, 3), unit_price: 12.35, lead_days: 7, subtotal: r2(200000 * 12.35), is_selected: true, notes: "أفضل سعر" },
    { id: uid(), rfq_id: rfq1.id, rfq_no: rfq1.rfq_no, vendor_id: vendorA.id, vendor_name: vendorA.name_ar, quote_date: d(3, 3), unit_price: 12.8, lead_days: 5, subtotal: r2(200000 * 12.8), is_selected: false, notes: "تسليم أسرع" },
    { id: uid(), rfq_id: rfq2.id, rfq_no: rfq2.rfq_no, vendor_id: vendorA.id, vendor_name: vendorA.name_ar, quote_date: d(3, 16), unit_price: 24.1, lead_days: 10, subtotal: r2(120000 * 24.1), is_selected: false, notes: null },
  ];

  // --- أمر شراء مستلم بالكامل ومفوتر ومدفوع
  const po1 = {
    id: uid(), po_no: "PO-2101", rfq_no: rfq1.rfq_no,
    vendor_id: vendorB.id, vendor_name: vendorB.name_ar,
    order_date: d(3, 4), expected_date: d(3, 11),
    warehouse_id: wh.id, warehouse_name: wh.name_ar,
    payment_terms_days: 30, wht_pct: 1,
    subtotal: r2(200000 * 12.35), discount_total: 0, vat_total: 0, total: r2(200000 * 12.35),
    currency: "EGP", status: "received", notes: "ذرة صفراء 200 طن — مرسّى من RFQ-0001",
  };
  // --- أمر شراء مستلم جزئياً
  const po2 = {
    id: uid(), po_no: "PO-2102", rfq_no: null,
    vendor_id: vendorA.id, vendor_name: vendorA.name_ar,
    order_date: d(3, 8), expected_date: d(3, 18),
    warehouse_id: wh2.id, warehouse_name: wh2.name_ar,
    payment_terms_days: 45, wht_pct: 1,
    subtotal: r2(100000 * 24), discount_total: 0, vat_total: 0, total: r2(100000 * 24),
    currency: "EGP", status: "partially_received", notes: "كسب صويا — توريد على دفعات",
  };
  // --- أمر شراء معتمد لم يُستلم
  const po3 = {
    id: uid(), po_no: "PO-2103", rfq_no: null,
    vendor_id: vendorA.id, vendor_name: vendorA.name_ar,
    order_date: d(3, 15), expected_date: d(3, 28),
    warehouse_id: wh.id, warehouse_name: wh.name_ar,
    payment_terms_days: 30, wht_pct: 1,
    subtotal: r2(80000 * 9.8), discount_total: 0, vat_total: r2(80000 * 9.8 * 0.14), total: r2(80000 * 9.8 * 1.14),
    currency: "EGP", status: "approved", notes: "رجيع كون 80 طن",
  };
  const acc_purchase_orders = [po1, po2, po3];

  const poLine = (
    po: Row, item: Item, quantity_kg: number, unit_price: number, vat_rate: number,
    received_kg: number, billed_kg: number,
  ) => ({
    id: uid(), po_id: po.id, po_no: po.po_no, line_no: 1,
    item_id: item.id, item_code: item.code, item_name: item.name_ar, unit: "كجم",
    quantity_kg, unit_price, discount_pct: 0, vat_rate,
    line_total: r2(quantity_kg * unit_price * (1 + vat_rate / 100)),
    received_kg, billed_kg,
  });
  const po1Line = poLine(po1, corn, 200000, 12.35, 0, 200000, 200000);
  const po2Line = poLine(po2, soy, 100000, 24, 0, 60000, 60000);
  const po3Line = poLine(po3, bran, 80000, 9.8, 14, 0, 0);
  const acc_purchase_order_lines = [po1Line, po2Line, po3Line];

  // --- إذون الاستلام
  const grn1 = {
    id: uid(), grn_no: "GRN-0001", grn_date: d(3, 11),
    po_id: po1.id, po_no: po1.po_no, vendor_id: vendorB.id, vendor_name: vendorB.name_ar,
    warehouse_id: wh.id, warehouse_name: wh.name_ar,
    truck_no: "ق ص ط 4471", driver_name: "عبد الله شعبان",
    gross_weight_kg: 214500, tare_weight_kg: 14500, net_weight_kg: 200000,
    variance_kg: 0, landed_cost_total: 24000,
    status: "billed", journal_no: "JV-000101", notes: "توريد كامل — مطابق للأمر",
  };
  const grn2 = {
    id: uid(), grn_no: "GRN-0002", grn_date: d(3, 17),
    po_id: po2.id, po_no: po2.po_no, vendor_id: vendorA.id, vendor_name: vendorA.name_ar,
    warehouse_id: wh2.id, warehouse_name: wh2.name_ar,
    truck_no: "ب ن هـ 2290", driver_name: "رمضان السيد",
    gross_weight_kg: 73200, tare_weight_kg: 13200, net_weight_kg: 60000,
    variance_kg: 0, landed_cost_total: 0,
    status: "billed", journal_no: "JV-000103", notes: "الدفعة الأولى 60 طن",
  };
  const acc_goods_receipts = [grn1, grn2];

  const acc_goods_receipt_lines: Row[] = [
    { id: uid(), grn_id: grn1.id, grn_no: grn1.grn_no, po_line_id: po1Line.id, line_no: 1, item_id: corn.id, item_code: corn.code, item_name: corn.name_ar, ordered_kg: 200000, received_kg: 200000, unit_cost: 12.35, landed_unit_cost: r2(12.35 + 24000 / 200000), vat_rate: 0, line_total: r2(200000 * 12.35), billed_kg: 200000 },
    { id: uid(), grn_id: grn2.id, grn_no: grn2.grn_no, po_line_id: po2Line.id, line_no: 1, item_id: soy.id, item_code: soy.code, item_name: soy.name_ar, ordered_kg: 100000, received_kg: 60000, unit_cost: 24, landed_unit_cost: 24, vat_rate: 0, line_total: r2(60000 * 24), billed_kg: 60000 },
  ];
  addMove(corn, "in", 200000, r2(12.35 + 24000 / 200000), grn1.grn_date, "goods_receipt", grn1.grn_no, wh);
  addMove(soy, "in", 60000, 24, grn2.grn_date, "goods_receipt", grn2.grn_no, wh2);

  // --- مصاريف الوصول (نولون)
  const acc_landed_costs: Row[] = [
    {
      id: uid(), cost_no: "LC-0001", cost_date: d(3, 11), grn_id: grn1.id, grn_no: grn1.grn_no,
      cost_type: "نولون نقل", vendor_id: freightVendor.id, vendor_name: freightVendor.name_ar,
      amount: 24000, allocation: "weight", status: "posted", journal_no: "JV-000102",
      notes: "نقل 200 طن من الميناء للمخزن",
    },
  ];

  // --- فواتير الموردين
  const bill1Subtotal = r2(200000 * 12.35);
  const bill1 = {
    id: uid(), bill_no: "VB-0001", vendor_ref: "3391/2026", bill_date: d(3, 12), due_date: d(4, 11),
    po_no: po1.po_no, grn_no: grn1.grn_no, grn_id: grn1.id,
    vendor_id: vendorB.id, vendor_name: vendorB.name_ar, vendor_vat: vendorB.vat_number,
    subtotal: bill1Subtotal, vat_total: 0, wht_pct: 1, wht_total: r2(bill1Subtotal * 0.01),
    stamp_total: 0, total: bill1Subtotal, net_payable: r2(bill1Subtotal * 0.99),
    paid_amount: r2(bill1Subtotal * 0.99), balance: 0,
    match_status: "matched", status: "paid", journal_no: "JV-000104", notes: null,
  };
  const bill2Subtotal = r2(60000 * 24);
  const bill2 = {
    id: uid(), bill_no: "VB-0002", vendor_ref: "A-7712", bill_date: d(3, 18), due_date: d(5, 2),
    po_no: po2.po_no, grn_no: grn2.grn_no, grn_id: grn2.id,
    vendor_id: vendorA.id, vendor_name: vendorA.name_ar, vendor_vat: vendorA.vat_number,
    subtotal: bill2Subtotal, vat_total: 0, wht_pct: 1, wht_total: r2(bill2Subtotal * 0.01),
    stamp_total: 0, total: bill2Subtotal, net_payable: r2(bill2Subtotal * 0.99),
    paid_amount: 0, balance: r2(bill2Subtotal * 0.99),
    match_status: "matched", status: "posted", journal_no: "JV-000105", notes: "استحقاق 45 يوم",
  };
  const acc_vendor_bills = [bill1, bill2];

  const acc_vendor_bill_lines: Row[] = [
    { id: uid(), bill_id: bill1.id, bill_no: bill1.bill_no, line_no: 1, item_code: corn.code, item_name: corn.name_ar, quantity_kg: 200000, unit_price: 12.35, vat_rate: 0, line_total: bill1Subtotal },
    { id: uid(), bill_id: bill2.id, bill_no: bill2.bill_no, line_no: 1, item_code: soy.code, item_name: soy.name_ar, quantity_kg: 60000, unit_price: 24, vat_rate: 0, line_total: bill2Subtotal },
  ];

  const acc_purchase_returns: Row[] = [
    {
      id: uid(), return_no: "PR-0001", return_date: d(3, 19), grn_no: grn2.grn_no, grn_id: grn2.id,
      po_no: po2.po_no, vendor_id: vendorA.id, vendor_name: vendorA.name_ar,
      warehouse_id: wh2.id, warehouse_name: wh2.name_ar,
      item_id: soy.id, item_code: soy.code, item_name: soy.name_ar,
      quantity_kg: 2000, unit_cost: 24, subtotal: 48000, vat_total: 0, total: 48000,
      reason: "نسبة رطوبة أعلى من المواصفة", status: "posted", journal_no: "JV-000106", notes: null,
    },
  ];
  addMove(soy, "out", 2000, 24, d(3, 19), "purchase_return", "PR-0001", wh2);

  /* ===================== دورة المبيعات ===================== */

  const q1 = {
    id: uid(), quote_no: "QT-0001", quote_date: d(3, 6), valid_until: d(3, 20),
    customer_id: custA.id, customer_name: custA.name_ar, customer_vat: custA.vat_number,
    warehouse_id: wh.id, warehouse_name: wh.name_ar,
    subtotal: r2(60000 * 21.8), discount_total: 0, vat_total: r2(60000 * 21.8 * 0.14), total: r2(60000 * 21.8 * 1.14),
    status: "confirmed", notes: "علف بادي دواجن 60 طن",
  };
  const q2 = {
    id: uid(), quote_no: "QT-0002", quote_date: d(3, 21), valid_until: d(4, 5),
    customer_id: custB.id, customer_name: custB.name_ar, customer_vat: custB.vat_number,
    warehouse_id: wh.id, warehouse_name: wh.name_ar,
    subtotal: r2(40000 * 18.6), discount_total: 0, vat_total: r2(40000 * 18.6 * 0.14), total: r2(40000 * 18.6 * 1.14),
    status: "sent", notes: "علف مركز ألبان — بانتظار موافقة العميل",
  };
  const acc_sales_quotations = [q1, q2];

  const acc_sales_quotation_lines: Row[] = [
    { id: uid(), quote_id: q1.id, quote_no: q1.quote_no, line_no: 1, item_id: broiler.id, item_code: broiler.code, item_name: broiler.name_ar, quantity_kg: 60000, unit_price: 21.8, discount_pct: 0, vat_rate: 14, line_total: r2(60000 * 21.8 * 1.14) },
    { id: uid(), quote_id: q2.id, quote_no: q2.quote_no, line_no: 1, item_id: dairy.id, item_code: dairy.code, item_name: dairy.name_ar, quantity_kg: 40000, unit_price: 18.6, discount_pct: 0, vat_rate: 14, line_total: r2(40000 * 18.6 * 1.14) },
  ];

  const so1 = {
    id: uid(), so_no: "SO-0001", so_date: d(3, 8), quote_no: q1.quote_no,
    customer_id: custA.id, customer_name: custA.name_ar, customer_vat: custA.vat_number,
    warehouse_id: wh.id, warehouse_name: wh.name_ar,
    payment_terms_days: 30, delivery_date: d(3, 13),
    subtotal: r2(60000 * 21.8), discount_total: 0, vat_total: r2(60000 * 21.8 * 0.14), total: r2(60000 * 21.8 * 1.14),
    status: "invoiced", notes: "مرحّل من عرض السعر QT-0001",
  };
  const so2 = {
    id: uid(), so_no: "SO-0002", so_date: d(3, 16), quote_no: null,
    customer_id: custB.id, customer_name: custB.name_ar, customer_vat: custB.vat_number,
    warehouse_id: wh.id, warehouse_name: wh.name_ar,
    payment_terms_days: 21, delivery_date: d(3, 24),
    subtotal: r2(50000 * 18.6), discount_total: 0, vat_total: r2(50000 * 18.6 * 0.14), total: r2(50000 * 18.6 * 1.14),
    status: "partially_delivered", notes: "تسليم على دفعات حسب طلب العميل",
  };
  const so3 = {
    id: uid(), so_no: "SO-0003", so_date: today(), quote_no: null,
    customer_id: custA.id, customer_name: custA.name_ar, customer_vat: custA.vat_number,
    warehouse_id: wh.id, warehouse_name: wh.name_ar,
    payment_terms_days: 30, delivery_date: today(),
    subtotal: r2(30000 * 20.4), discount_total: 0, vat_total: r2(30000 * 20.4 * 0.14), total: r2(30000 * 20.4 * 1.14),
    status: "confirmed", notes: "محجوز بالمخزن — لم يُسلَّم",
  };
  const acc_sales_orders = [so1, so2, so3];

  const soLine = (so: Row, item: Item, quantity_kg: number, unit_price: number, delivered_kg: number, invoiced_kg: number) => ({
    id: uid(), so_id: so.id, so_no: so.so_no, line_no: 1,
    item_id: item.id, item_code: item.code, item_name: item.name_ar, unit: "كجم",
    warehouse_id: so.warehouse_id, warehouse_name: so.warehouse_name,
    quantity_kg, unit_price, discount_pct: 0, vat_rate: 14,
    line_total: r2(quantity_kg * unit_price * 1.14),
    delivered_kg, invoiced_kg,
  });
  const so1Line = soLine(so1, broiler, 60000, 21.8, 60000, 60000);
  const so2Line = soLine(so2, dairy, 50000, 18.6, 20000, 20000);
  const so3Line = soLine(so3, items.find((i) => i.code === "FD-2002")!, 30000, 20.4, 0, 0);
  const acc_sales_order_lines = [so1Line, so2Line, so3Line];

  const do1 = {
    id: uid(), do_no: "DO-0001", do_date: d(3, 13), so_id: so1.id, so_no: so1.so_no,
    customer_id: custA.id, customer_name: custA.name_ar,
    warehouse_id: wh.id, warehouse_name: wh.name_ar,
    truck_no: "س ع ر 8813", driver_name: "أشرف مصطفى", driver_phone: "01001234567",
    gross_weight_kg: 74200, tare_weight_kg: 14200, net_weight_kg: 60000,
    cogs_total: r2(60000 * broiler.cost_price), status: "invoiced",
    journal_no: "JV-000110", notes: "تسليم أرض العميل",
  };
  const do2 = {
    id: uid(), do_no: "DO-0002", do_date: d(3, 24), so_id: so2.id, so_no: so2.so_no,
    customer_id: custB.id, customer_name: custB.name_ar,
    warehouse_id: wh.id, warehouse_name: wh.name_ar,
    truck_no: "ل م ن 5522", driver_name: "سامح فؤاد", driver_phone: "01109876543",
    gross_weight_kg: 33500, tare_weight_kg: 13500, net_weight_kg: 20000,
    cogs_total: r2(20000 * dairy.cost_price), status: "invoiced",
    journal_no: "JV-000112", notes: "الدفعة الأولى",
  };
  const acc_deliveries = [do1, do2];

  const acc_delivery_lines: Row[] = [
    { id: uid(), do_id: do1.id, do_no: do1.do_no, so_line_id: so1Line.id, line_no: 1, item_id: broiler.id, item_code: broiler.code, item_name: broiler.name_ar, ordered_kg: 60000, delivered_kg: 60000, unit_price: 21.8, vat_rate: 14, unit_cost: broiler.cost_price, line_total: r2(60000 * 21.8 * 1.14), invoiced_kg: 60000 },
    { id: uid(), do_id: do2.id, do_no: do2.do_no, so_line_id: so2Line.id, line_no: 1, item_id: dairy.id, item_code: dairy.code, item_name: dairy.name_ar, ordered_kg: 50000, delivered_kg: 20000, unit_price: 18.6, vat_rate: 14, unit_cost: dairy.cost_price, line_total: r2(20000 * 18.6 * 1.14), invoiced_kg: 20000 },
  ];
  addMove(broiler, "out", 60000, broiler.cost_price, do1.do_date, "delivery", do1.do_no, wh);
  addMove(dairy, "out", 20000, dairy.cost_price, do2.do_date, "delivery", do2.do_no, wh);

  const acc_sales_returns: Row[] = [
    {
      id: uid(), return_no: "SR-0001", return_date: d(3, 27), invoice_number: "INV-2101",
      do_no: do2.do_no, customer_id: custB.id, customer_name: custB.name_ar,
      warehouse_id: wh.id, warehouse_name: wh.name_ar,
      item_id: dairy.id, item_code: dairy.code, item_name: dairy.name_ar,
      quantity_kg: 1000, unit_price: 18.6, subtotal: 18600, vat_total: r2(18600 * 0.14), total: r2(18600 * 1.14),
      reason: "فرق وزن عند الاستلام", status: "posted", journal_no: "JV-000113", notes: null,
    },
  ];
  addMove(dairy, "in", 1000, dairy.cost_price, d(3, 27), "sales_return", "SR-0001", wh);

  /* فواتير البيع الناتجة عن التسليمات */
  const inv1Subtotal = r2(60000 * 21.8);
  const inv2Subtotal = r2(20000 * 18.6);
  const cycleInvoices: Row[] = [
    {
      id: uid(), invoice_number: "INV-2100", icv: 100, so_no: so1.so_no, do_no: do1.do_no,
      buyer_name: custA.name_ar, buyer_vat_number: custA.vat_number, invoice_type: "b2b",
      subtotal: inv1Subtotal, vat_total: r2(inv1Subtotal * 0.14), total: r2(inv1Subtotal * 1.14),
      paid_amount: r2(inv1Subtotal * 1.14), balance: 0, currency: "EGP", device_id: null,
      status: "posted", issue_date: d(3, 13), due_date: d(4, 12), notes: "محصلة بالكامل",
    },
    {
      id: uid(), invoice_number: "INV-2101", icv: 101, so_no: so2.so_no, do_no: do2.do_no,
      buyer_name: custB.name_ar, buyer_vat_number: custB.vat_number, invoice_type: "b2b",
      subtotal: inv2Subtotal, vat_total: r2(inv2Subtotal * 0.14), total: r2(inv2Subtotal * 1.14),
      paid_amount: 0, balance: r2(inv2Subtotal * 1.14), currency: "EGP", device_id: null,
      status: "posted", issue_date: d(3, 24), due_date: d(4, 14), notes: null,
    },
  ];
  const cycleInvoiceLines: Row[] = [
    { id: uid(), invoice_id: cycleInvoices[0].id, line_no: 1, item_code: broiler.code, description: broiler.name_ar, quantity: 60000, unit: "كجم", unit_price: 21.8, vat_rate: 14, vat_amount: r2(inv1Subtotal * 0.14), line_total: r2(inv1Subtotal * 1.14) },
    { id: uid(), invoice_id: cycleInvoices[1].id, line_no: 1, item_code: dairy.code, description: dairy.name_ar, quantity: 20000, unit: "كجم", unit_price: 18.6, vat_rate: 14, vat_amount: r2(inv2Subtotal * 0.14), line_total: r2(inv2Subtotal * 1.14) },
  ];

  return {
    tables: {
      acc_doc_settings: [{ ...DEFAULT_SETTINGS }],
      acc_rfqs,
      acc_rfq_lines,
      acc_rfq_quotes,
      acc_purchase_orders,
      acc_purchase_order_lines,
      acc_goods_receipts,
      acc_goods_receipt_lines,
      acc_landed_costs,
      acc_vendor_bills,
      acc_vendor_bill_lines,
      acc_purchase_returns,
      acc_sales_quotations,
      acc_sales_quotation_lines,
      acc_sales_orders,
      acc_sales_order_lines,
      acc_deliveries,
      acc_delivery_lines,
      acc_sales_returns,
      __cycle_invoices: cycleInvoices,
      __cycle_invoice_lines: cycleInvoiceLines,
    },
    stockMoves,
  };
}
