import { useCallback } from "react";

import { OpenTabsBar } from "@/components/sales/OpenTabsBar";
import { PosCashier, type PosDraft } from "@/components/sales/PosCashier";
import { money } from "@/lib/format";
import { useDb } from "@/lib/mockDb";
import { useOpenTabs } from "@/lib/openTabs";
import { invoiceTotals } from "@/lib/sales";

/** مساحة عمل الكاشير — عدة فواتير (تكتات) معلّقة فى نفس الوقت */
export function PosWorkspace() {
  const data = useDb();
  const { tabs, activeId, active, ready, addTab, activate, closeTab, saveState } = useOpenTabs("sales.pos");

  const onDraftChange = useCallback(
    (snapshot: PosDraft) => {
      if (!activeId) return;
      const customer =
        snapshot.customerKind === "registered" && snapshot.customerId
          ? data.customers.find((c) => c.id === snapshot.customerId)?.name ?? "عميل مسجل"
          : "عميل نقدي";
      const lines = snapshot.lines ?? [];
      const totals = invoiceTotals({
        lines,
        payMethod: snapshot.payMethod ?? "cash",
        payCash: 0,
        payCard: 0,
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
        addLabel="فاتورة معلّقة جديدة"
      />
      <PosCashier
        key={activeId}
        draftSeed={(active?.state as PosDraft | undefined) ?? null}
        onDraftChange={onDraftChange}
        onSaved={() => closeTab(activeId)}
      />
    </div>
  );
}
