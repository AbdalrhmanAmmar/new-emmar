import { useSyncExternalStore } from "react";

/* ============================================================
 * تفضيلات الواجهة (حجم الخط) — تُحفظ فى localStorage
 * ============================================================ */

const STORAGE_KEY = "ui:font-scale";
const DEFAULT_SCALE = 100;

export const FONT_SCALES = [85, 90, 100, 110, 120, 130] as const;

export const FONT_SCALE_LABEL: Record<number, string> = {
  85: "صغير جداً",
  90: "صغير",
  100: "افتراضى",
  110: "كبير",
  120: "أكبر",
  130: "ضخم",
};

let current = DEFAULT_SCALE;
const listeners = new Set<() => void>();

function clamp(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SCALE;
  return Math.min(150, Math.max(75, Math.round(value)));
}

function apply(scale: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = `${(16 * scale) / 100}px`;
}

function readStored() {
  if (typeof window === "undefined") return DEFAULT_SCALE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? clamp(Number(raw)) : DEFAULT_SCALE;
}

/** تحميل الإعداد المحفوظ وتطبيقه — يُستدعى مرة عند بدء التطبيق */
export function initFontScale() {
  if (typeof window === "undefined") return;
  current = readStored();
  apply(current);
  listeners.forEach((fn) => fn());
}

export function getFontScale() {
  return current;
}

export function setFontScale(scale: number) {
  current = clamp(scale);
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, String(current));
  apply(current);
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useFontScale() {
  return useSyncExternalStore(subscribe, getFontScale, () => DEFAULT_SCALE);
}
