import React from 'react';
import InvoiceEditorPage from './InvoiceEditorPage';

const AccSalesB2CPage: React.FC = () => (
  <InvoiceEditorPage
    mode="b2c"
    pageTitle="فاتورة مبسطة (B2C)"
    pageDescription="نقطة بيع سريعة — تُطبع مباشرة مع QR وتُبلَّغ للهيئة (Reporting) خلال 24 ساعة."
  />
);
export default AccSalesB2CPage;
