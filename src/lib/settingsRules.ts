/** أدوات مساعدة لتطبيق الإعدادات الرئيسية على منطق البرنامج */

/** إضافة عدد أيام لتاريخ بصيغة YYYY-MM-DD */
export function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00`);
  if (Number.isNaN(base.getTime())) return date;
  base.setDate(base.getDate() + Number(days || 0));
  return base.toISOString().slice(0, 10);
}
