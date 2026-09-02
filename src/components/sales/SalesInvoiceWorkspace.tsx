import { useCallback } from "react";

import { OpenTabsBar } from "@/components/sales/OpenTabsBar";
import { SalesInvoiceEditor } from "@/components/sales/SalesInvoiceEditor";
import { money } from "@/lib/format";
import { useDb, type SalesInvoice } from "@/lib/mockDb";
import { useOpenTabs } from "@/lib/openTabs";
import { invoiceTotals } from "@/lib/sales";

/** مساحة عمل فواتير المبيعات — عدة فواتير مفتوحة فى نفس الوقت */
export function SalesInvoiceWorkspace() {
  const data = useDb();
  const { tabs, activeId, active, ready, addTab, activate, closeTab, saveState } = useOpenTabs("sales.invoice");

  const onDraftChange = useCallback(
    (snapshot: Partial<SalesInvoice>) => {
      if (!activeId) return;
      const customer = snapshot.customerId
        ? data.customers.find((c) => c.id === snapshot.customerId)?.name ?? "عميل مسجل"
        : snapshot.customerName || "عميل نقدي";
      const lines = snapshot.lines ?? [];
      const totals = invoiceTotals({
        lines,
        payMethod: snapshot.payMethod ?? "cash",
        payCash: Number(snapshot.payCash ?? 0),
        payCard: Number(snapshot.payCard ?? 0),
        codePercent: 0,
      });
      saveState(
        activeId,
        snapshot as Record<string, unknown>,
        customer,
        `${lines.length} صنف • ${money(totals.total)}`,
      );
    },
    [activeId, data.customers, saveState],
  );

  if (!ready || !activeId) return null;

  return (
    <div className="space-y-3">
      <OpenTabsBar
        tabs={tabs}
        activeId={activeId}
        onActivate={activate}
        onAdd={addTab}
        onClose={closeTab}
        addLabel="فاتورة جديدة"
      />
      <SalesInvoiceEditor
        key={activeId}
        draftSeed={(active?.state as Partial<SalesInvoice> | undefined) ?? null}
        onDraftChange={onDraftChange}
        onSaved={() => closeTab(activeId)}
      />
    </div>
  );
}
