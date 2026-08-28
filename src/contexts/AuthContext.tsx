/**
 * Demo auth context (الوضع الافتراضي).
 *
 * There is no login screen in this build: a pre-authenticated admin profile is
 * provided so every accounting page renders with full permissions.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";

export type DemoProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
};

export type DemoUser = {
  id: string;
  email: string;
};

export type AuthContextValue = {
  user: DemoUser | null;
  session: null;
  profile: DemoProfile | null;
  userRole: string;
  loading: boolean;
  isAdmin: boolean;
  hasPermission: (permission?: string) => boolean;
  signOut: () => Promise<void>;
};

const DEMO_USER: DemoUser = { id: "demo-user", email: "admin@demo.local" };

const DEMO_PROFILE: DemoProfile = {
  id: "demo-user",
  full_name: "مدير النظام",
  email: "admin@demo.local",
  phone: null,
  avatar_url: null,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(
    () => ({
      user: DEMO_USER,
      session: null,
      profile: DEMO_PROFILE,
      userRole: "admin",
      loading: false,
      isAdmin: true,
      hasPermission: () => true,
      signOut: async () => {},
    }),
    [],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;
  // Safe fallback so pages work even outside the provider (demo mode).
  return {
    user: DEMO_USER,
    session: null,
    profile: DEMO_PROFILE,
    userRole: "admin",
    loading: false,
    isAdmin: true,
    hasPermission: () => true,
    signOut: async () => {},
  };
}
