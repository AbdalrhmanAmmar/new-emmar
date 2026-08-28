import { createFileRoute } from '@tanstack/react-router';
import AccStockMovesPage from '@/pages/accounting/AccStockMovesPage';

export const Route = createFileRoute('/accounting/stock-moves')({
  head: () => ({
    meta: [
      { title: 'حركة المخزون | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'تسجيل وارد ومنصرف وتحويلات الأعلاف بين المخازن بالكيلوجرام مع مراقبة الأرصدة.' },
      { property: 'og:title', content: 'حركة المخزون' },
      { property: 'og:description', content: 'وارد ومنصرف وتحويلات وتسويات الجرد لأصناف الأعلاف.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccStockMovesPage,
});
