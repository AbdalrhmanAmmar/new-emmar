import { useCallback, useEffect, useMemo, useState } from "react";

/** فواتير مفتوحة فى نفس الوقت (تعليق فاتورة والرجوع لها لاحقاً) */
export interface OpenTab {
  id: string;
  label: string;
  hint?: string;
  /** لقطة كاملة لحالة الفاتورة داخل هذا التاب */
  state?: Record<string, unknown>;
  createdAt: number;
}

const key = (scope: string) => `openTabs.${scope}`;
const activeKey = (scope: string) => `openTabs.${scope}.active`;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

function read(scope: string): OpenTab[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(scope));
    const rows = raw ? (JSON.parse(raw) as OpenTab[]) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function write(scope: string, rows: OpenTab[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(scope), JSON.stringify(rows));
  notify();
}

function readActive(scope: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(activeKey(scope));
}

function writeActive(scope: string, id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(activeKey(scope), id);
  else window.localStorage.removeItem(activeKey(scope));
  notify();
}

const newTab = (index: number): OpenTab => ({
  id: `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  label: `فاتورة ${index}`,
  createdAt: Date.now(),
});

/**
 * إدارة تابات الفواتير المفتوحة لكل شاشة (scope) — محفوظة محلياً
 * حتى لا تُفقد أى فاتورة عند التنقل أو تحديث الصفحة.
 */
export function useOpenTabs(scope: string) {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => {
    setTabs(read(scope));
    setActiveId(readActive(scope));
  }, [scope]);

  useEffect(() => {
    let rows = read(scope);
    if (rows.length === 0) {
      rows = [newTab(1)];
      write(scope, rows);
    }
    let active = readActive(scope);
    if (!active || !rows.some((t) => t.id === active)) {
      active = rows[0].id;
      writeActive(scope, active);
    }
    setTabs(rows);
    setActiveId(active);
    setReady(true);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [scope, sync]);

  const active = useMemo(() => tabs.find((t) => t.id === activeId) ?? null, [tabs, activeId]);

  const addTab = useCallback(() => {
    const rows = read(scope);
    const tab = newTab(rows.length + 1);
    write(scope, [...rows, tab]);
    writeActive(scope, tab.id);
    return tab.id;
  }, [scope]);

  const activate = useCallback((id: string) => writeActive(scope, id), [scope]);

  const closeTab = useCallback(
    (id: string) => {
      const rows = read(scope).filter((t) => t.id !== id);
      const next = rows.length > 0 ? rows : [newTab(1)];
      write(scope, next);
      if (readActive(scope) === id) writeActive(scope, next[0].id);
    },
    [scope],
  );

  /** حفظ لقطة حالة التاب النشط (تُنادى تلقائياً أثناء العمل) */
  const saveState = useCallback(
    (id: string, state: Record<string, unknown>, label?: string, hint?: string) => {
      const rows = read(scope);
      const found = rows.find((t) => t.id === id);
      if (!found) return;
      const same =
        JSON.stringify(found.state ?? null) === JSON.stringify(state) &&
        found.label === (label ?? found.label) &&
        found.hint === (hint ?? found.hint);
      if (same) return;
      write(
        scope,
        rows.map((t) => (t.id === id ? { ...t, state, label: label ?? t.label, hint: hint ?? t.hint } : t)),
      );
    },
    [scope],
  );

  return { tabs, activeId, active, ready, addTab, activate, closeTab, saveState };
}
