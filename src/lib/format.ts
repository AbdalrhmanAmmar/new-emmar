const numFmt = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intFmt = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/** المبالغ بالجنيه المصري وبأرقام إنجليزية */
export function money(value: number | null | undefined): string {
  return `${numFmt.format(Number(value ?? 0))} ج.م`;
}

export function num(value: number | null | undefined): string {
  return numFmt.format(Number(value ?? 0));
}

export function int(value: number | null | undefined): string {
  return intFmt.format(Number(value ?? 0));
}

/** التواريخ بالصيغة الإنجليزية dd/mm/yyyy */
export function dateFmt(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function dateTimeFmt(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dateFmt(value)} ${hh}:${mi}`;
}

export function today(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function monthKey(value: string): string {
  return String(value).slice(0, 7);
}
