import { createFileRoute } from '@tanstack/react-router';
import AccLandedCostsPage from '@/pages/accounting/AccLandedCostsPage';

export const Route = createFileRoute('/accounting/landed-costs')({
  head: () => ({
    meta: [
      { title: 'مصاريف الوصول والنولون | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'توزيع النولون ومصاريف النقل على أصناف إذن الاستلام بنسبة الوزن لتكلفة طن واقعية.' },
      { property: 'og:title', content: 'مصاريف الوصول والنولون — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'توزيع النولون ومصاريف النقل على أصناف إذن الاستلام بنسبة الوزن لتكلفة طن واقعية.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccLandedCostsPage,
});
