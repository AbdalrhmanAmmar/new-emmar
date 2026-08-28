import React from 'react';
import InvoiceEditorPage from './InvoiceEditorPage';

const AccSalesB2BPage: React.FC = () => (
  <InvoiceEditorPage
    mode="b2b"
    pageTitle="فاتورة ضريبية (B2B)"
    pageDescription="بيانات العميل كاملة + اعتماد فوري (Clearance) من الهيئة قبل إصدارها للعميل."
  />
);
export default AccSalesB2BPage;
