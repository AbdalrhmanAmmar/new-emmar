import React from 'react';
import { Truck } from 'lucide-react';
import PartyMasterPage from './PartyMasterPage';

const AccVendorsPage: React.FC = () => (
  <PartyMasterPage
    table="acc_vendors"
    title="الموردون"
    subtitle="سجل الموردين مع الأرصدة الافتتاحية والبيانات البنكية للسداد"
    typeField="vendor_type"
    moduleKey="accounting_vendors"
    showBankDetails
    icon={<Truck className="w-6 h-6" />}
  />
);
export default AccVendorsPage;
