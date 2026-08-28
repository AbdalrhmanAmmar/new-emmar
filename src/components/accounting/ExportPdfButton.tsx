import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { exportToPDF } from '@/utils/pdfExport';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  kpis?: { label: string; value: string | number }[];
  orientation?: 'portrait' | 'landscape';
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg';
}

const ExportPdfButton: React.FC<Props> = ({
  title, subtitle, headers, rows, kpis, orientation, disabled, size = 'default',
}) => {
  const { profile, userRole } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      await exportToPDF({
        title,
        subtitle,
        headers,
        rows,
        kpis,
        userName: profile?.full_name || 'مستخدم',
        userRole: userRole || 'مستخدم',
        orientation: orientation ?? (headers.length > 5 ? 'landscape' : 'portrait'),
      });
      toast.success('تم تصدير PDF');
    } catch (e) {
      console.error(e);
      toast.error('تعذّر تصدير PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="default" size={size} onClick={handleClick} disabled={disabled || loading || rows.length === 0}>
      <FileText className="w-4 h-4 ml-2" />
      {loading ? 'جارٍ التصدير...' : 'تصدير PDF'}
    </Button>
  );
};

export default ExportPdfButton;
