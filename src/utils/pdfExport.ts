// Heavy deps (jspdf, html2canvas) are lazy-loaded inside the exporter.
import { escapeHtml as esc } from '@/lib/utils';

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  userName: string;
  userRole: string;
  kpis?: { label: string; value: string | number }[];
  orientation?: 'portrait' | 'landscape';
  selectedHeaders?: number[];
  selectedKpis?: number[];
  returnBlob?: boolean;
  companyName?: string;
  onProgress?: (percent: number, label: string) => void;
}

const FOOTER_HEIGHT_MM = 12;
const RENDER_WIDTH = 1200;
const FONT_FAMILY = "'IBM Plex Sans Arabic', 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif";

// Preload Arabic font to ensure html2canvas captures it
const ensureArabicFont = async () => {
  try {
    await document.fonts.load(`16px "IBM Plex Sans Arabic"`);
  } catch {
    // Font may already be loaded or not available — fallback will be used
  }
};

const buildFullDocument = (
  title: string,
  subtitle: string | undefined,
  userName: string,
  userRole: string,
  dateStr: string,
  timeStr: string,
  filteredHeaders: string[],
  filteredRows: (string | number)[][],
  filteredKpis: { label: string; value: string | number }[],
  companyName: string
): HTMLDivElement => {
  const colCount = filteredHeaders.length;
  const fontSize = colCount > 7 ? 9 : colCount > 5 ? 10 : 11;
  const cellPadding = colCount > 7 ? '5px 4px' : '7px 8px';

  const el = document.createElement('div');
  el.lang = 'ar';
  el.style.cssText = `width: ${RENDER_WIDTH}px; font-family: ${FONT_FAMILY}; background: #fff; color: #1a2a44; direction: rtl; text-align: right;`;

  let html = `
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 28px 36px; position: relative; overflow: hidden;">
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 80 80&quot;><circle cx=&quot;40&quot; cy=&quot;40&quot; r=&quot;35&quot; fill=&quot;none&quot; stroke=&quot;rgba(255,255,255,0.03)&quot; stroke-width=&quot;1&quot;/></svg>') repeat; opacity: 0.5;"></div>
      <div style="position: relative; z-index: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <div style="color: rgba(255,255,255,0.5); font-size: 11px; margin-bottom: 4px;">${esc(companyName)}</div>
            <div style="color: #fff; font-size: 24px; font-weight: 800; line-height: 1.4;">${esc(title)}</div>
            ${subtitle ? `<div style="color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 4px; line-height: 1.5;">${esc(subtitle)}</div>` : ''}
          </div>
          <div style="text-align: left; color: rgba(255,255,255,0.7); font-size: 10px; line-height: 1.8;">
            <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 16px;">
              <div><span style="color: rgba(255,255,255,0.4);">تاريخ الإصدار:</span> ${esc(dateStr)}</div>
              <div><span style="color: rgba(255,255,255,0.4);">وقت الطباعة:</span> ${esc(timeStr)}</div>
              <div><span style="color: rgba(255,255,255,0.4);">أُعد بواسطة:</span> ${esc(userName)}</div>
              <div><span style="color: rgba(255,255,255,0.4);">الصفة:</span> ${esc(userRole)}</div>
            </div>
          </div>
        </div>
        <div style="height: 3px; background: linear-gradient(90deg, #3b82f6, #06b6d4, transparent); border-radius: 2px;"></div>
      </div>
    </div>
  `;

  // KPIs
  if (filteredKpis.length > 0) {
    html += `
      <div style="display: flex; gap: 10px; padding: 16px 36px 20px; direction: rtl; flex-wrap: wrap;">
        ${filteredKpis.map((k, i) => {
          const colors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
          const color = colors[i % colors.length];
          return `
            <div style="flex: 1; min-width: 130px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: relative; overflow: hidden;">
              <div style="position: absolute; top: 0; right: 0; width: 4px; height: 100%; background: ${color}; border-radius: 0 10px 10px 0;"></div>
              <div style="font-size: 10px; color: #94a3b8; margin-bottom: 6px; font-weight: 500;">${esc(k.label)}</div>
              <div style="font-size: 15px; font-weight: 800; color: #0f172a; word-break: break-word;">${esc(k.value)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Table
  html += `
    <div style="padding: 0 28px 20px;">
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: ${fontSize}px; table-layout: auto; word-wrap: break-word; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
        <thead><tr>${filteredHeaders.map(h =>
          `<th style="background: linear-gradient(180deg, #1e293b, #0f172a); color: #fff; padding: ${cellPadding}; text-align: center; font-weight: 600; font-size: ${fontSize}px; border-bottom: 2px solid #3b82f6;">${esc(h)}</th>`
        ).join('')}</tr></thead>
        <tbody>
          ${filteredRows.map((row, i) => `
            <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              ${row.map(cell => `<td style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #f1f5f9; font-size: ${fontSize}px; word-break: break-word; max-width: 200px;">${esc(cell)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  el.innerHTML = html;
  return el;
};

const buildFooterEl = (dateStr: string, pageNum: number, totalPages: number, companyName: string): HTMLDivElement => {
  const el = document.createElement('div');
  el.style.cssText = `
    width: ${RENDER_WIDTH}px; box-sizing: border-box;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 10px 36px; display: flex; justify-content: space-between; align-items: center;
    font-family: ${FONT_FAMILY};
    font-size: 10px; color: rgba(255,255,255,0.8); direction: rtl;
  `;
  el.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px;">
      <span style="color: rgba(255,255,255,0.4);">●</span>
      <span>سري — للاستخدام الداخلي فقط</span>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 3px 12px; border-radius: 12px; font-weight: 600;">صفحة ${pageNum} من ${totalPages}</div>
    <div style="display: flex; align-items: center; gap: 6px;">
      <span>تاريخ الإصدار: ${esc(dateStr)}</span>
      <span style="color: rgba(255,255,255,0.3);">|</span>
      <span>${esc(companyName)}</span>
    </div>
  `;
  return el;
};

export const exportToPDF = async ({
  title,
  subtitle,
  headers,
  rows,
  userName,
  userRole,
  kpis,
  orientation = 'landscape',
  selectedHeaders,
  selectedKpis,
  returnBlob = false,
  companyName = 'المتكامل لإدارة المشاريع',
  onProgress,
}: PDFExportOptions): Promise<Blob | void> => {
  const yieldUI = () => new Promise(r => setTimeout(r, 0));
  onProgress?.(3, 'بدء التصدير...');
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  const filteredHeaderIndices = selectedHeaders ?? headers.map((_, i) => i);
  const filteredHeaders = filteredHeaderIndices.map(i => headers[i]);
  const filteredRows = rows.map(row => filteredHeaderIndices.map(i => row[i]));
  const filteredKpis = kpis
    ? (selectedKpis ?? kpis.map((_, i) => i)).map(i => kpis[i]).filter(Boolean)
    : [];

  onProgress?.(8, 'تحميل مكتبات PDF...');
  await yieldUI();
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableHeight = pageHeight - FOOTER_HEIGHT_MM;

  // Ensure Arabic font is loaded before rendering
  onProgress?.(15, 'تحميل الخطوط العربية...');
  await ensureArabicFont();

  onProgress?.(20, 'بناء قالب التقرير...');
  await yieldUI();
  const fullEl = buildFullDocument(title, subtitle, userName, userRole, dateStr, timeStr, filteredHeaders, filteredRows, filteredKpis, companyName);
  fullEl.style.position = 'fixed';
  fullEl.style.top = '-9999px';
  fullEl.style.left = '-9999px';
  document.body.appendChild(fullEl);

  // Wait for fonts to be applied to the element
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    // Dynamic scale: lower for large tables to dramatically speed up rasterization.
    // <=50 rows -> 1.5 (crisp), <=200 -> 1.3, else 1.1 (still readable).
    const rowsCount = filteredRows.length;
    const dynamicScale = rowsCount <= 50 ? 1.5 : rowsCount <= 200 ? 1.3 : 1.1;

    onProgress?.(28, 'تحويل التقرير إلى صورة...');
    await yieldUI();
    const canvas = await html2canvas(fullEl, {
      scale: dynamicScale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 0,
      removeContainer: true,
    });

    document.body.removeChild(fullEl);

    const srcWidthPx = canvas.width;
    const srcHeightPx = canvas.height;
    const pxPerMM = srcWidthPx / pageWidth;
    const usableHeightPx = usableHeight * pxPerMM;

    const totalPages = Math.max(1, Math.ceil(srcHeightPx / usableHeightPx));
    onProgress?.(45, `تقسيم الصفحات (${totalPages})...`);
    await yieldUI();

    // Reusable slice canvas (avoid allocating one per page)
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = srcWidthPx;
    const ctx = sliceCanvas.getContext('2d')!;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      const srcY = page * usableHeightPx;
      const sliceHeight = Math.min(usableHeightPx, srcHeightPx - srcY);

      if (sliceHeight <= 0) continue;

      sliceCanvas.height = sliceHeight;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, srcY, srcWidthPx, sliceHeight, 0, 0, srcWidthPx, sliceHeight);

      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.85);
      const sliceHeightMM = sliceHeight / pxPerMM;
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, sliceHeightMM, undefined, 'FAST');

      // 45% → 75% across page slicing
      const pct = 45 + Math.round(((page + 1) / totalPages) * 30);
      onProgress?.(pct, `إضافة الصفحات (${page + 1}/${totalPages})...`);
      await yieldUI();
    }

    // ⚡ Optimization: rasterize ALL footers in ONE html2canvas pass
    // instead of N passes (was the slowest part of export).
    onProgress?.(78, 'تجهيز التذييلات...');
    await yieldUI();

    const footersWrap = document.createElement('div');
    footersWrap.style.cssText = `position: fixed; top: -99999px; left: -99999px; width: ${RENDER_WIDTH}px;`;
    let footersHtml = '';
    for (let i = 1; i <= totalPages; i++) {
      footersHtml += `
        <div style="width: ${RENDER_WIDTH}px; box-sizing: border-box; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 10px 36px; display: flex; justify-content: space-between; align-items: center; font-family: ${FONT_FAMILY}; font-size: 10px; color: rgba(255,255,255,0.8); direction: rtl;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: rgba(255,255,255,0.4);">●</span>
            <span>سري — للاستخدام الداخلي فقط</span>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 3px 12px; border-radius: 12px; font-weight: 600;">صفحة ${i} من ${totalPages}</div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>تاريخ الإصدار: ${esc(dateStr)}</span>
            <span style="color: rgba(255,255,255,0.3);">|</span>
            <span>${esc(companyName)}</span>
          </div>
        </div>
      `;
    }
    footersWrap.innerHTML = footersHtml;
    document.body.appendChild(footersWrap);

    const footersCanvas = await html2canvas(footersWrap, {
      scale: 1,
      backgroundColor: '#0f172a',
      logging: false,
      removeContainer: true,
      imageTimeout: 0,
    });
    document.body.removeChild(footersWrap);

    const footerSliceHeightPx = footersCanvas.height / totalPages;
    const footerSlice = document.createElement('canvas');
    footerSlice.width = footersCanvas.width;
    footerSlice.height = footerSliceHeightPx;
    const fctx = footerSlice.getContext('2d')!;

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      fctx.clearRect(0, 0, footerSlice.width, footerSlice.height);
      fctx.drawImage(
        footersCanvas,
        0, (i - 1) * footerSliceHeightPx, footersCanvas.width, footerSliceHeightPx,
        0, 0, footerSlice.width, footerSlice.height,
      );
      const fImg = footerSlice.toDataURL('image/jpeg', 0.82);
      pdf.addImage(fImg, 'JPEG', 0, usableHeight, pageWidth, FOOTER_HEIGHT_MM, undefined, 'FAST');

      const pct = 80 + Math.round((i / totalPages) * 15);
      onProgress?.(pct, `إضافة التذييلات (${i}/${totalPages})...`);
    }


    onProgress?.(98, 'حفظ الملف...');
    await yieldUI();
    if (returnBlob) {
      onProgress?.(100, 'تم!');
      return pdf.output('blob');
    }
    pdf.save(`${title}_${now.toISOString().split('T')[0]}.pdf`);
    onProgress?.(100, 'تم!');
  } catch (err) {
    if (fullEl.parentNode) document.body.removeChild(fullEl);
    throw err;
  }
};

export const exportToPDFBlob = async (options: PDFExportOptions): Promise<Blob> => {
  return exportToPDF({ ...options, returnBlob: true }) as Promise<Blob>;
};
