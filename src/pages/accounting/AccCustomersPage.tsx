import React from 'react';
import { Users } from 'lucide-react';
import PartyMasterPage from './PartyMasterPage';

const AccCustomersPage: React.FC = () => (
  <PartyMasterPage
    table="acc_customers"
    title="العملاء"
    subtitle="سجل العملاء مع الأرصدة الافتتاحية وحدود الائتمان وشروط السداد"
    typeField="customer_type"
    moduleKey="accounting_customers"
    icon={<Users className="w-6 h-6" />}
  />
);
export default AccCustomersPage;
