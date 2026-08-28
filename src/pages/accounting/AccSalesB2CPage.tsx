import React from 'react';
import InvoiceEditorPage from './InvoiceEditorPage';

const AccSalesB2CPage: React.FC = () => (
  <InvoiceEditorPage
    mode="b2c"
    pageTitle="فاتورة بيع نقدي (كاش)"
    pageDescription="بيع مباشر للمزارع والعملاء النقديين — يُصرف المخزون فوراً وتُسجَّل الضريبة 14%."
  />
);
export default AccSalesB2CPage;
