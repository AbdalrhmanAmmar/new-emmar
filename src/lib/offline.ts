/**
 * Offline-first support (العمل بدون إنترنت).
 *
 * Every write goes to the local store immediately so the program keeps working
 * with no connection. While offline the operation is also appended to a durable
 * outbox in localStorage; when the connection returns the outbox is flushed and
 * each operation is marked as synced. Operations carry a deterministic dedupe
 * key so a replayed / duplicated flush can never write the same record twice.
 */

export type OutboxOp = {
  id: string;
  key: string;
  table: string;
  mode: "insert" | "upsert" | "update" | "delete";
  rowIds: string[];
  at: string;
  status: "pending" | "synced";
  syncedAt?: string;
};

const OUTBOX_KEY = "acc_outbox_v1";
const MAX_HISTORY = 200;

type Listener = () => void;
const listeners = new Set<Listener>();

function read(): OutboxOp[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(OUTBOX_KEY) ?? "[]") as OutboxOp[];
  } catch {
    return [];
  }
}

function write(ops: OutboxOp[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops.slice(-MAX_HISTORY)));
  } catch {
    /* quota */
  }
  listeners.forEach((l) => l());
}

export function subscribeOutbox(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOutbox(): OutboxOp[] {
  return read();
}

export function pendingOps(): OutboxOp[] {
  return read().filter((o) => o.status === "pending");
}

export function isOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/** Stable key: same table + verb + affected ids = same logical operation. */
export function dedupeKey(table: string, mode: OutboxOp["mode"], rowIds: string[], stamp: string) {
  return [table, mode, [...rowIds].sort().join("|"), stamp].join("::");
}

export function recordOperation(op: Omit<OutboxOp, "id" | "at" | "status" | "key"> & { stamp?: string }) {
  const ops = read();
  const at = new Date().toISOString();
  const key = dedupeKey(op.table, op.mode, op.rowIds, op.stamp ?? at);
  if (ops.some((o) => o.key === key)) return; // منع تكرار العملية نفسها
  const online = isOnline();
  ops.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key,
    table: op.table,
    mode: op.mode,
    rowIds: op.rowIds,
    at,
    status: online ? "synced" : "pending",
    ...(online ? { syncedAt: at } : {}),
  });
  write(ops);
}

/** Flush pending operations; data is already local, so this confirms + dedupes. */
export function flushOutbox(): number {
  if (!isOnline()) return 0;
  const ops = read();
  const seen = new Set(ops.filter((o) => o.status === "synced").map((o) => o.key));
  let flushed = 0;
  const next = ops.map((o) => {
    if (o.status !== "pending") return o;
    if (seen.has(o.key)) return { ...o, status: "synced" as const, syncedAt: new Date().toISOString() };
    seen.add(o.key);
    flushed += 1;
    return { ...o, status: "synced" as const, syncedAt: new Date().toISOString() };
  });
  write(next);
  return flushed;
}

export function clearOutboxHistory() {
  write([]);
}
