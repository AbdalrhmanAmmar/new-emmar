import { useSyncExternalStore } from "react";

import {
  PERM_ACTIONS,
  getDb,
  mutate,
  type AppRole,
  type AppUser,
  type PermAction,
  type PermMap,
} from "./mockDb";

const KEY = "iman.session.v1";

export interface SessionState {
  userId: string | null;
  since: string | null;
  remember: boolean;
}

const EMPTY: SessionState = { userId: null, since: null, remember: false };

let state: SessionState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): SessionState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY) ?? window.sessionStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as SessionState;
    return { userId: parsed.userId ?? null, since: parsed.since ?? null, remember: !!parsed.remember };
  } catch {
    return EMPTY;
  }
}

function persist(next: SessionState) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.sessionStorage.removeItem(KEY);
  if (!next.userId) return;
  const store = next.remember ? window.localStorage : window.sessionStorage;
  store.setItem(KEY, JSON.stringify(next));
}

function emit() {
  listeners.forEach((l) => l());
}

function ensure() {
  if (!hydrated && typeof window !== "undefined") {
    state = read();
    hydrated = true;
  }
  return state;
}

export function getSession(): SessionState {
  return ensure();
}

export interface SignInResult {
  ok: boolean;
  error?: string;
  user?: AppUser;
}

/** تسجيل الدخول باسم المستخدم أو البريد + كلمة المرور */
export function signIn(identifier: string, password: string, remember = false): SignInResult {
  const id = identifier.trim().toLowerCase();
  const pass = password.trim();
  if (!id) return { ok: false, error: "أدخل اسم المستخدم أو البريد الإلكترونى" };
  if (!pass) return { ok: false, error: "أدخل كلمة المرور" };

  const data = getDb();
  const user = data.users.find(
    (u) =>
      (u.username ?? "").trim().toLowerCase() === id ||
      (u.email ?? "").trim().toLowerCase() === id ||
      (u.code ?? "").trim().toLowerCase() === id,
  );
  if (!user) return { ok: false, error: "بيانات الدخول غير صحيحة" };
  if (user.active === false) return { ok: false, error: "هذا المستخدم موقوف — راجع مدير النظام" };
  if ((user.password ?? "") !== pass) return { ok: false, error: "بيانات الدخول غير صحيحة" };
  if (!user.roleId) return { ok: false, error: "لا يوجد دور صلاحيات لهذا المستخدم" };

  const now = new Date().toISOString();
  mutate((db) => {
    const target = db.users.find((u) => u.id === user.id);
    if (target) target.lastLogin = now;
  });

  state = { userId: user.id, since: now, remember };
  hydrated = true;
  persist(state);
  emit();
  return { ok: true, user };
}

export function signOut() {
  state = EMPTY;
  hydrated = true;
  persist(state);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const onStorage = () => {
      state = read();
      emit();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => listeners.delete(listener);
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, ensure, () => EMPTY);
}

/* ===================== الصلاحيات ===================== */

export interface CurrentUser {
  user: AppUser;
  role: AppRole | undefined;
  perms: PermMap;
  superAdmin: boolean;
}

export function resolveUser(userId: string | null): CurrentUser | null {
  if (!userId) return null;
  const data = getDb();
  const user = data.users.find((u) => u.id === userId);
  if (!user || user.active === false) return null;
  const role = data.roles.find((r) => r.id === user.roleId);
  return {
    user,
    role,
    perms: role?.permissions ?? {},
    superAdmin: !!role?.superAdmin,
  };
}

/** هوك المستخدم الحالى مع صلاحياته */
export function useCurrentUser(): CurrentUser | null {
  const session = useSession();
  return resolveUser(session.userId);
}

export function hasPerm(current: CurrentUser | null, screen: string, action: PermAction = "view"): boolean {
  if (!current) return false;
  if (current.superAdmin) return true;
  return (current.perms[screen] ?? []).includes(action);
}

export function allowedActions(current: CurrentUser | null, screen: string): PermAction[] {
  if (!current) return [];
  if (current.superAdmin) return [...PERM_ACTIONS];
  return current.perms[screen] ?? [];
}

/** خريطة المسارات => مفتاح الشاشة (الأطول أولاً عند المطابقة) */
const ROUTE_PERMS: Array<{ prefix: string; screen: string }> = [
  { prefix: "/treasury/settings", screen: "system.settings" },
  { prefix: "/treasury/safes", screen: "treasury.safes" },
  { prefix: "/treasury/vouchers", screen: "treasury.vouchers" },
  { prefix: "/treasury/receipts", screen: "treasury.vouchers" },
  { prefix: "/treasury/payments", screen: "treasury.vouchers" },
  { prefix: "/treasury/transfers", screen: "treasury.transfers" },
  { prefix: "/treasury/shifts", screen: "treasury.shifts" },
  { prefix: "/treasury/reports", screen: "reports.all" },
  { prefix: "/treasury", screen: "treasury.safes" },
  { prefix: "/sales/pos", screen: "sales.pos" },
  { prefix: "/sales/returns", screen: "sales.returns" },
  { prefix: "/sales/customers", screen: "sales.customers" },
  { prefix: "/sales/products", screen: "sales.products" },
  { prefix: "/sales/units", screen: "sales.products" },
  { prefix: "/sales/reports", screen: "reports.all" },
  { prefix: "/sales", screen: "sales.invoices" },
  { prefix: "/purchases/returns", screen: "purchases.returns" },
  { prefix: "/purchases/suppliers", screen: "purchases.suppliers" },
  { prefix: "/purchases/reports", screen: "reports.all" },
  { prefix: "/purchases", screen: "purchases.invoices" },
  { prefix: "/inventory/warehouses", screen: "inventory.warehouses" },
  { prefix: "/inventory/balance", screen: "inventory.balance" },
  { prefix: "/inventory", screen: "inventory.moves" },
  { prefix: "/expenses", screen: "expenses.docs" },
  { prefix: "/hr/attendance", screen: "hr.attendance" },
  { prefix: "/hr/adjustments", screen: "hr.attendance" },
  { prefix: "/hr/payroll", screen: "hr.payroll" },
  { prefix: "/hr/statement", screen: "reports.all" },
  { prefix: "/hr", screen: "hr.employees" },
  { prefix: "/reports", screen: "reports.all" },
  { prefix: "/users", screen: "system.users" },
];

export function screenForPath(pathname: string): string | null {
  const hit = [...ROUTE_PERMS]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  return hit?.screen ?? null;
}

/** أول مسار مسموح للمستخدم — يُستخدم بعد تسجيل الدخول */
export function landingPath(current: CurrentUser | null): string {
  if (!current) return "/login";
  const order = [
    { screen: "treasury.safes", to: "/treasury" },
    { screen: "sales.invoices", to: "/sales" },
    { screen: "sales.pos", to: "/sales/pos" },
    { screen: "purchases.invoices", to: "/purchases" },
    { screen: "inventory.moves", to: "/inventory" },
    { screen: "expenses.docs", to: "/expenses" },
    { screen: "hr.employees", to: "/hr" },
    { screen: "reports.all", to: "/reports" },
    { screen: "system.users", to: "/users" },
  ];
  return order.find((o) => hasPerm(current, o.screen, "view"))?.to ?? "/no-access";
}
