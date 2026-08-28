import { createFileRoute } from '@tanstack/react-router';
import AccGoodsReceiptsPage from '@/pages/accounting/AccGoodsReceiptsPage';

export const Route = createFileRoute('/accounting/goods-receipts')({
  head: () => ({
    meta: [
      { title: 'إذون الاستلام المخزني | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'استلام الخامات بالقائمة الوزنية مع فروق الميزان وترحيل قيد المخزون تلقائياً.' },
      { property: 'og:title', content: 'إذون الاستلام المخزني — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'استلام الخامات بالقائمة الوزنية مع فروق الميزان وترحيل قيد المخزون تلقائياً.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccGoodsReceiptsPage,
});
