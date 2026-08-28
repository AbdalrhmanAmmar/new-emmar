/**
 * Demo data client (الوضع الافتراضي).
 *
 * Mirrors the small subset of the supabase-js query API that the accounting
 * module uses, backed by the local mock database in `@/lib/mockDb`.
 * No network calls, no external backend.
 */
import { getTable, writeTable, uid, type Row } from "@/lib/mockDb";

type Result<T = any> = { data: T; error: null | { message: string } };

type Filter = (row: Row) => boolean;

const norm = (v: any) => (v === null || v === undefined ? v : v);

class Query implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private orderBy: { column: string; asc: boolean } | null = null;
  private limitCount: number | null = null;
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row[] = [];
  private singleRow = false;
  private maybe = false;
  private returning = true;

  constructor(private table: string) {}

  // ---- filters ----
  eq(column: string, value: any) {
    this.filters.push((r) => String(norm(r[column])) === String(norm(value)));
    return this;
  }
  neq(column: string, value: any) {
    this.filters.push((r) => String(norm(r[column])) !== String(norm(value)));
    return this;
  }
  gt(column: string, value: any) {
    this.filters.push((r) => r[column] > value);
    return this;
  }
  gte(column: string, value: any) {
    this.filters.push((r) => r[column] >= value);
    return this;
  }
  lt(column: string, value: any) {
    this.filters.push((r) => r[column] < value);
    return this;
  }
  lte(column: string, value: any) {
    this.filters.push((r) => r[column] <= value);
    return this;
  }
  is(column: string, value: any) {
    this.filters.push((r) => (r[column] ?? null) === value);
    return this;
  }
  in(column: string, values: any[]) {
    const set = new Set((values ?? []).map((v) => String(v)));
    this.filters.push((r) => set.has(String(r[column])));
    return this;
  }
  like(column: string, pattern: string) {
    return this.ilike(column, pattern);
  }
  ilike(column: string, pattern: string) {
    const needle = String(pattern ?? "").replace(/%/g, "").toLowerCase();
    this.filters.push((r) => String(r[column] ?? "").toLowerCase().includes(needle));
    return this;
  }
  filter(column: string, op: string, value: any) {
    switch (op) {
      case "eq":
        return this.eq(column, value);
      case "neq":
        return this.neq(column, value);
      case "gt":
        return this.gt(column, value);
      case "gte":
        return this.gte(column, value);
      case "lt":
        return this.lt(column, value);
      case "lte":
        return this.lte(column, value);
      default:
        return this;
    }
  }
  or(_expr: string) {
    return this;
  }
  not(column: string, _op: string, value: any) {
    return this.neq(column, value);
  }

  // ---- shaping ----
  order(column: string, opts?: { ascending?: boolean }) {
    this.orderBy = { column, asc: opts?.ascending !== false };
    return this;
  }
  limit(count: number) {
    this.limitCount = count;
    return this;
  }
  range(from: number, to: number) {
    this.limitCount = to - from + 1;
    return this;
  }

  // ---- verbs ----
  select(_columns?: string) {
    if (this.mode === "select") this.mode = "select";
    this.returning = true;
    return this;
  }
  insert(values: Row | Row[]) {
    this.mode = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  upsert(values: Row | Row[]) {
    this.mode = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  update(values: Row) {
    this.mode = "update";
    this.payload = [values];
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }
  maybeSingle() {
    this.maybe = true;
    return this.run();
  }
  single() {
    this.singleRow = true;
    return this.run();
  }
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private matches(rows: Row[]) {
    return rows.filter((r) => this.filters.every((f) => f(r)));
  }

  private async run(): Promise<Result> {
    try {
      const rows = [...getTable(this.table)];

      if (this.mode === "insert" || this.mode === "upsert") {
        const created = this.payload.map((p) => ({
          id: p.id ?? uid(),
          created_at: new Date().toISOString(),
          ...p,
        }));
        const next = [...rows];
        created.forEach((row) => {
          const idx = next.findIndex((r) => r.id === row.id);
          if (idx >= 0) next[idx] = { ...next[idx], ...row };
          else next.push(row);
        });
        writeTable(this.table, next);
        return this.shape(created);
      }

      if (this.mode === "update") {
        const patch = this.payload[0] ?? {};
        const touched: Row[] = [];
        const next = rows.map((r) => {
          if (this.filters.every((f) => f(r))) {
            const merged = { ...r, ...patch, updated_at: new Date().toISOString() };
            touched.push(merged);
            return merged;
          }
          return r;
        });
        writeTable(this.table, next);
        return this.shape(touched);
      }

      if (this.mode === "delete") {
        const removed = this.matches(rows);
        writeTable(
          this.table,
          rows.filter((r) => !removed.includes(r)),
        );
        return this.shape(removed);
      }

      let out = this.matches(rows);
      if (this.orderBy) {
        const { column, asc } = this.orderBy;
        out = [...out].sort((a, b) => {
          const av = a[column];
          const bv = b[column];
          if (av === bv) return 0;
          if (av === null || av === undefined) return 1;
          if (bv === null || bv === undefined) return -1;
          const cmp = typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), "ar");
          return asc ? cmp : -cmp;
        });
      }
      if (this.limitCount !== null) out = out.slice(0, this.limitCount);
      return this.shape(out);
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? "خطأ في البيانات التجريبية" } };
    }
  }

  private shape(rows: Row[]): Result {
    if (this.singleRow || this.maybe) {
      const first = rows[0] ?? null;
      if (this.singleRow && !first) return { data: null, error: { message: "لا يوجد سجل" } };
      return { data: first, error: null };
    }
    return { data: rows, error: null };
  }
}

function nextNumber(table: string, column: string, prefix: string) {
  const rows = getTable(table);
  const max = rows.reduce((m, r) => {
    const raw = String(r[column] ?? "");
    const n = Number(raw.replace(/\D/g, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export const supabase = {
  from(table: string) {
    return new Query(table);
  },
  rpc(fn: string, params?: Row): Promise<Result> {
    switch (fn) {
      case "acc_next_journal_no":
        return Promise.resolve({ data: nextNumber("acc_journal_entries", "entry_number", "JV"), error: null });
      case "acc_next_payment_no":
        return Promise.resolve({ data: nextNumber("acc_payments", "payment_number", "PMT"), error: null });
      case "acc_next_device_icv": {
        const devices = getTable("acc_pos_devices");
        const target = devices.find((d) => d.id === params?.["p_device_id"]) ?? devices[0];
        const icv = Number(target?.icv ?? 0) + 1;
        if (target) {
          target.icv = icv;
          writeTable("acc_pos_devices", devices);
        }
        return Promise.resolve({ data: icv, error: null });
      }
      case "acc_close_fiscal_period": {
        const periods = getTable("acc_fiscal_periods");
        const target = periods.find((p) => p.id === params?.["p_period_id"]);
        if (target) {
          target.status = "closed";
          writeTable("acc_fiscal_periods", periods);
        }
        return Promise.resolve({ data: true, error: null });
      }
      default:
        return Promise.resolve({ data: null, error: null });
    }
  },
  functions: {
    invoke(_name: string, _opts?: any): Promise<Result> {
      return Promise.resolve({
        data: {
          success: true,
          demo: true,
          status: "cleared",
          response_code: "200",
          message: "تمت المعالجة في الوضع الافتراضي (بدون ربط خارجي)",
        },
        error: null,
      });
    },
  },
  auth: {
    getUser: () =>
      Promise.resolve({ data: { user: { id: "demo-user", email: "demo@example.com" } }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
  },
};

export default supabase;
