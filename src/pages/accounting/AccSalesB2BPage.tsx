import React from 'react';
import InvoiceEditorPage from './InvoiceEditorPage';

const AccSalesB2BPage: React.FC = () => (
  <InvoiceEditorPage
    mode="b2b"
    pageTitle="فاتورة بيع آجل للعملاء (شركات ومزارع)"
    pageDescription="فاتورة باسم العميل مع الرقم الضريبي — تُسجَّل على حساب العميل وتُخصم من رصيد المخزن."
  />
);
export default AccSalesB2BPage;
