import { createFileRoute } from '@tanstack/react-router';
import AccVendorBillsPage from '@/pages/accounting/AccVendorBillsPage';

export const Route = createFileRoute('/accounting/vendor-bills')({
  head: () => ({
    meta: [
      { title: 'فواتير الموردين والسداد | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'مطابقة ثلاثية بين أمر الشراء والاستلام وفاتورة المورد مع ض.ق.م 14% وخصم وحسم.' },
      { property: 'og:title', content: 'فواتير الموردين والسداد — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'مطابقة ثلاثية بين أمر الشراء والاستلام وفاتورة المورد مع ض.ق.م 14% وخصم وحسم.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccVendorBillsPage,
});
