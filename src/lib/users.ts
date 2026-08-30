import {
  PERM_ACTIONS,
  PERM_SCREENS,
  type AppRole,
  type AppUser,
  type DbShape,
  type PermAction,
  type PermMap,
} from "./mockDb";

/** الدور المرتبط بالمستخدم */
export function userRole(data: DbShape, user: AppUser): AppRole | undefined {
  return data.roles.find((r) => r.id === user.roleId);
}

export function roleName(data: DbShape, user: AppUser): string {
  return userRole(data, user)?.name ?? user.role ?? "بدون دور";
}

/** خريطة صلاحيات المستخدم الفعلية */
export function userPerms(data: DbShape, user: AppUser): PermMap {
  const role = userRole(data, user);
  if (!role) return {};
  if (role.superAdmin) {
    const map: PermMap = {};
    for (const screen of PERM_SCREENS) map[screen.key] = [...PERM_ACTIONS];
    return map;
  }
  return role.permissions ?? {};
}

/** هل يملك المستخدم صلاحية إجراء على شاشة؟ */
export function can(data: DbShape, userId: string, screen: string, action: PermAction): boolean {
  const user = data.users.find((u) => u.id === userId);
  if (!user || user.active === false) return false;
  const role = userRole(data, user);
  if (!role) return false;
  if (role.superAdmin) return true;
  return (role.permissions?.[screen] ?? []).includes(action);
}

/** عدد الصلاحيات المفعّلة فى دور */
export function roleScore(role: AppRole): { allowed: number; total: number; screens: number } {
  const total = PERM_SCREENS.length * PERM_ACTIONS.length;
  if (role.superAdmin) return { allowed: total, total, screens: PERM_SCREENS.length };
  let allowed = 0;
  let screens = 0;
  for (const screen of PERM_SCREENS) {
    const actions = role.permissions?.[screen.key] ?? [];
    allowed += actions.length;
    if (actions.length) screens += 1;
  }
  return { allowed, total, screens };
}

/** الشاشات مجمّعة حسب الموديول لعرض مصفوفة الصلاحيات */
export function screensByModule(): Array<{ module: string; screens: typeof PERM_SCREENS }> {
  const groups: Array<{ module: string; screens: typeof PERM_SCREENS }> = [];
  for (const screen of PERM_SCREENS) {
    const found = groups.find((g) => g.module === screen.module);
    if (found) found.screens.push(screen);
    else groups.push({ module: screen.module, screens: [screen] });
  }
  return groups;
}

export function usersKpis(data: DbShape) {
  return {
    users: data.users.length,
    active: data.users.filter((u) => u.active !== false).length,
    stopped: data.users.filter((u) => u.active === false).length,
    roles: data.roles.length,
    noRole: data.users.filter((u) => !u.roleId).length,
  };
}

/** تقييم قوة كلمة المرور */
export function passwordHint(password: string): { ok: boolean; text: string } {
  const value = password.trim();
  if (value.length < 6) return { ok: false, text: "كلمة المرور قصيرة (6 أحرف على الأقل)" };
  const strong = /[A-Za-z]/.test(value) && /[0-9]/.test(value);
  return { ok: true, text: strong ? "كلمة مرور جيدة" : "الأفضل خلط حروف وأرقام" };
}
