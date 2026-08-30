import {
  PERM_ACTIONS,
  PERM_SCREENS,
  emptyPerms,
  isDuplicate,
  mutate,
  nextCode,
  uid,
  type AppRole,
  type AppUser,
  type PermAction,
  type PermMap,
} from "./mockDb";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/* ===================== المستخدمون ===================== */

export function saveUser(input: Partial<AppUser> & { id?: string }): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const name = (input.name ?? "").trim();
    const username = (input.username ?? "").trim();
    const password = (input.password ?? "").trim();

    if (!name) {
      result = { ok: false, error: "اسم المستخدم مطلوب" };
      return;
    }
    if (!username) {
      result = { ok: false, error: "اسم الدخول (Username) مطلوب" };
      return;
    }
    if (/\s/.test(username)) {
      result = { ok: false, error: "اسم الدخول لا يصح أن يحتوى مسافات" };
      return;
    }
    if (password.length < 6) {
      result = { ok: false, error: "كلمة المرور 6 أحرف على الأقل" };
      return;
    }
    if (isDuplicate(data.users, "username", username, input.id)) {
      result = { ok: false, error: "اسم الدخول مستخدم بالفعل" };
      return;
    }
    const code = (input.code ?? "").trim() || nextCode("US", data.users.map((u) => u.code ?? ""));
    if (isDuplicate(data.users, "code", code, input.id)) {
      result = { ok: false, error: "كود المستخدم مكرر" };
      return;
    }
    if (!input.roleId) {
      result = { ok: false, error: "اختر دور الصلاحيات للمستخدم" };
      return;
    }

    const role = data.roles.find((r) => r.id === input.roleId);
    const record: AppUser = {
      id: input.id ?? uid("us"),
      code,
      name,
      role: role?.name ?? input.role ?? "",
      username,
      password,
      phone: (input.phone ?? "").trim(),
      email: (input.email ?? "").trim(),
      branchId: input.branchId ?? data.branches[0]?.id ?? "",
      roleId: input.roleId,
      active: input.active ?? true,
      note: (input.note ?? "").trim(),
      lastLogin: input.lastLogin ?? null,
    };

    if (input.id && data.users.some((u) => u.id === input.id)) {
      data.users = data.users.map((u) => (u.id === record.id ? record : u));
    } else {
      data.users.push(record);
    }
    result = { ok: true, id: record.id };
  });
  return result;
}

export function deleteUser(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const user = data.users.find((u) => u.id === id);
    if (!user) {
      result = { ok: false, error: "المستخدم غير موجود" };
      return;
    }
    const role = data.roles.find((r) => r.id === user.roleId);
    if (role?.superAdmin && data.users.filter((u) => data.roles.find((r) => r.id === u.roleId)?.superAdmin).length <= 1) {
      result = { ok: false, error: "لا يمكن حذف آخر مدير للنظام" };
      return;
    }
    const used =
      data.vouchers.some((v) => v.userId === id) ||
      data.salesInvoices.some((i) => i.userId === id) ||
      data.purchaseInvoices.some((i) => i.userId === id) ||
      data.stockMoves.some((m) => m.userId === id);
    if (used) {
      result = { ok: false, error: "المستخدم عليه حركات مسجلة — يمكن إيقافه بدلاً من الحذف" };
      return;
    }
    data.users = data.users.filter((u) => u.id !== id);
    result = { ok: true };
  });
  return result;
}

export function toggleUser(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const user = data.users.find((u) => u.id === id);
    if (!user) {
      result = { ok: false, error: "المستخدم غير موجود" };
      return;
    }
    user.active = user.active === false;
    result = { ok: true };
  });
  return result;
}

export function resetPassword(id: string, password: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const user = data.users.find((u) => u.id === id);
    if (!user) {
      result = { ok: false, error: "المستخدم غير موجود" };
      return;
    }
    if (password.trim().length < 6) {
      result = { ok: false, error: "كلمة المرور 6 أحرف على الأقل" };
      return;
    }
    user.password = password.trim();
    result = { ok: true };
  });
  return result;
}

/* ===================== الأدوار والصلاحيات ===================== */

export function saveRole(input: Partial<AppRole> & { id?: string }): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const name = (input.name ?? "").trim();
    if (!name) {
      result = { ok: false, error: "اسم الدور مطلوب" };
      return;
    }
    if (isDuplicate(data.roles, "name", name, input.id)) {
      result = { ok: false, error: "اسم الدور مكرر" };
      return;
    }
    const code = (input.code ?? "").trim() || nextCode("RL", data.roles.map((r) => r.code));
    const existing = input.id ? data.roles.find((r) => r.id === input.id) : undefined;
    const record: AppRole = {
      id: input.id ?? uid("rl"),
      code,
      name,
      description: (input.description ?? "").trim(),
      superAdmin: input.superAdmin ?? existing?.superAdmin ?? false,
      system: existing?.system ?? false,
      permissions: input.permissions ?? existing?.permissions ?? emptyPerms(),
    };
    if (existing) {
      data.roles = data.roles.map((r) => (r.id === record.id ? record : r));
      // تحديث المسمى الظاهر لمستخدمى الدور
      data.users = data.users.map((u) => (u.roleId === record.id ? { ...u, role: record.name } : u));
    } else {
      data.roles.push(record);
    }
    result = { ok: true, id: record.id };
  });
  return result;
}

export function deleteRole(id: string): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const role = data.roles.find((r) => r.id === id);
    if (!role) {
      result = { ok: false, error: "الدور غير موجود" };
      return;
    }
    if (role.system) {
      result = { ok: false, error: "دور أساسى فى النظام — لا يمكن حذفه" };
      return;
    }
    if (data.users.some((u) => u.roleId === id)) {
      result = { ok: false, error: "الدور مرتبط بمستخدمين — انقلهم لدور آخر أولاً" };
      return;
    }
    data.roles = data.roles.filter((r) => r.id !== id);
    result = { ok: true };
  });
  return result;
}

/** تبديل صلاحية واحدة (شاشة + إجراء) */
export function togglePermission(roleId: string, screen: string, action: PermAction): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const role = data.roles.find((r) => r.id === roleId);
    if (!role) {
      result = { ok: false, error: "الدور غير موجود" };
      return;
    }
    if (role.superAdmin) {
      result = { ok: false, error: "مدير النظام يمتلك كل الصلاحيات دائماً" };
      return;
    }
    const perms: PermMap = { ...(role.permissions ?? {}) };
    const current = perms[screen] ?? [];
    if (current.includes(action)) {
      perms[screen] = current.filter((a) => a !== action);
    } else {
      // أى إجراء يستلزم صلاحية العرض
      perms[screen] = action === "view" ? [...current, action] : [...new Set<PermAction>([...current, "view", action])];
    }
    role.permissions = perms;
    result = { ok: true };
  });
  return result;
}

/** تبديل كل إجراءات شاشة */
export function toggleScreen(roleId: string, screen: string, on: boolean): ActionResult {
  return applyPerms(roleId, (perms) => {
    perms[screen] = on ? [...PERM_ACTIONS] : [];
  });
}

/** تبديل إجراء معين على كل الشاشات */
export function toggleAction(roleId: string, action: PermAction, on: boolean): ActionResult {
  return applyPerms(roleId, (perms) => {
    for (const screen of PERM_SCREENS) {
      const current = perms[screen.key] ?? [];
      if (on) {
        perms[screen.key] = [...new Set<PermAction>([...current, "view", action])];
      } else {
        perms[screen.key] = current.filter((a) => a !== action);
      }
    }
  });
}

/** فتح أو غلق كل الصلاحيات */
export function setAllPermissions(roleId: string, on: boolean): ActionResult {
  return applyPerms(roleId, (perms) => {
    for (const screen of PERM_SCREENS) perms[screen.key] = on ? [...PERM_ACTIONS] : [];
  });
}

function applyPerms(roleId: string, fn: (perms: PermMap) => void): ActionResult {
  let result: ActionResult = { ok: true };
  mutate((data) => {
    const role = data.roles.find((r) => r.id === roleId);
    if (!role) {
      result = { ok: false, error: "الدور غير موجود" };
      return;
    }
    if (role.superAdmin) {
      result = { ok: false, error: "مدير النظام يمتلك كل الصلاحيات دائماً" };
      return;
    }
    const perms: PermMap = { ...(role.permissions ?? {}) };
    fn(perms);
    role.permissions = perms;
    result = { ok: true };
  });
  return result;
}
