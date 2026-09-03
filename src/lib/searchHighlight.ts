/* ============================================================
 * تمييز نتيجة البحث الشامل بعد فتح صفحتها
 * يبحث عن أول عنصر يحتوى النص المطلوب داخل الصفحة، يمرر إليه
 * الشاشة ويضيف عليه تأثير «هوفر» لعدة ثوانٍ حتى يراه المستخدم.
 * ============================================================ */

const CLASS = "search-flash";
let pending: string | null = null;

export function requestHighlight(term: string) {
  pending = term.trim();
}

function findTarget(term: string): HTMLElement | null {
  const needle = term.toLowerCase();
  const scope = document.querySelector("main") ?? document.body;
  const candidates = scope.querySelectorAll<HTMLElement>("tr, li, article, [data-row], .rounded-xl, .rounded-lg");
  let best: HTMLElement | null = null;
  for (const el of Array.from(candidates)) {
    const text = (el.textContent ?? "").toLowerCase();
    if (!text.includes(needle)) continue;
    if (!best || text.length < (best.textContent ?? "").length) best = el;
  }
  return best;
}

/** يحاول تمييز العنصر عدة مرات لحين اكتمال تحميل الصفحة */
export function runPendingHighlight() {
  if (typeof document === "undefined" || !pending) return;
  const term = pending;
  pending = null;
  let tries = 0;
  const attempt = () => {
    const target = findTarget(term);
    if (!target) {
      if (++tries < 12) window.setTimeout(attempt, 250);
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add(CLASS);
    window.setTimeout(() => target.classList.remove(CLASS), 4000);
  };
  window.setTimeout(attempt, 250);
}
