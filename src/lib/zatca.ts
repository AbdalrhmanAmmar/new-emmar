// ZATCA helpers: TLV QR (Phase 2 fields), SHA-256 hashing, invoice-total math, and a compact UBL 2.1 XML template.
// These run in the browser; the *signature* is added by an Edge Function that owns the private key.

export interface ZatcaQrFields {
  sellerName: string;
  sellerVat: string;
  timestampIso: string; // ISO-8601 datetime
  totalWithVat: number; // gross total
  vatTotal: number;
  invoiceHashBase64?: string; // Phase 2 tag 6
  digitalSignatureBase64?: string; // Phase 2 tag 7
  publicKeyBase64?: string; // Phase 2 tag 8
  certificateSignatureBase64?: string; // Phase 2 tag 9 (simplified only)
}

const enc = new TextEncoder();

function tlv(tag: number, valueBytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(2 + valueBytes.length);
  out[0] = tag;
  out[1] = valueBytes.length;
  out.set(valueBytes, 2);
  return out;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

function b64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBytes(b: string): Uint8Array {
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Build ZATCA TLV QR (Base64). Phase 1 = tags 1..5; Phase 2 also includes 6..9 when provided. */
export function buildZatcaQrBase64(f: ZatcaQrFields): string {
  const chunks: Uint8Array[] = [
    tlv(1, enc.encode(f.sellerName)),
    tlv(2, enc.encode(f.sellerVat)),
    tlv(3, enc.encode(f.timestampIso)),
    tlv(4, enc.encode(f.totalWithVat.toFixed(2))),
    tlv(5, enc.encode(f.vatTotal.toFixed(2))),
  ];
  if (f.invoiceHashBase64) chunks.push(tlv(6, b64ToBytes(f.invoiceHashBase64)));
  if (f.digitalSignatureBase64) chunks.push(tlv(7, b64ToBytes(f.digitalSignatureBase64)));
  if (f.publicKeyBase64) chunks.push(tlv(8, b64ToBytes(f.publicKeyBase64)));
  if (f.certificateSignatureBase64) chunks.push(tlv(9, b64ToBytes(f.certificateSignatureBase64)));
  return b64(concat(chunks));
}

export async function sha256Base64(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return b64(new Uint8Array(digest));
}

export function newUuidV4(): string {
  // crypto.randomUUID is available in modern browsers
  // deno-lint-ignore no-explicit-any
  return (crypto as any).randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  vatRate?: number; // default 15
  vatCategory?: 'S' | 'Z' | 'E' | 'O';
  unit?: string;
  itemCode?: string;
}

export interface InvoiceLineComputed extends Required<Omit<InvoiceLineInput, 'itemCode' | 'unit'>> {
  itemCode?: string;
  unit: string;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  total: number;
  lines: InvoiceLineComputed[];
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeInvoiceTotals(inputs: InvoiceLineInput[]): InvoiceTotals {
  const lines: InvoiceLineComputed[] = inputs.map((l) => {
    const qty = Number(l.quantity) || 0;
    const price = Number(l.unitPrice) || 0;
    const discount = Number(l.discountAmount) || 0;
    const rate = l.vatRate ?? 15;
    const gross = qty * price;
    const net = round2(Math.max(0, gross - discount));
    const cat = l.vatCategory ?? 'S';
    const vat = round2(cat === 'S' ? net * (rate / 100) : 0);
    return {
      description: l.description,
      quantity: qty,
      unitPrice: price,
      discountAmount: discount,
      vatRate: rate,
      vatCategory: cat,
      unit: l.unit ?? 'PCE',
      itemCode: l.itemCode,
      netAmount: net,
      vatAmount: vat,
      totalAmount: round2(net + vat),
    };
  });
  const subtotal = round2(lines.reduce((s, l) => s + l.netAmount, 0));
  const discountTotal = round2(lines.reduce((s, l) => s + l.discountAmount, 0));
  const vatTotal = round2(lines.reduce((s, l) => s + l.vatAmount, 0));
  const total = round2(subtotal + vatTotal);
  return { subtotal, discountTotal, vatTotal, total, lines };
}

const xmlEscape = (s: string) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export interface UblInvoiceParams {
  invoiceNumber: string;
  uuid: string;
  issueDate: string;   // YYYY-MM-DD
  issueTime: string;   // HH:MM:SS
  invoiceTypeCode: '388' | '381' | '383'; // 388 invoice, 381 credit note, 383 debit note
  isSimplified: boolean;
  icv: number;
  pih?: string;
  seller: { name: string; vat: string; street?: string; city?: string; postal?: string; country?: string };
  buyer?: { name?: string; vat?: string; street?: string; city?: string; postal?: string; country?: string };
  totals: InvoiceTotals;
  currency?: string;
}

/**
 * Minimal UBL 2.1 invoice for ZATCA (not signed).
 * Actual signing (XAdES + Certificate) MUST happen server-side.
 */
export function buildUblInvoiceXml(p: UblInvoiceParams): string {
  const cur = p.currency ?? 'EGP';
  const subtypeName = p.isSimplified
    ? (p.invoiceTypeCode === '388' ? '0200000' : '0200000')
    : (p.invoiceTypeCode === '388' ? '0100000' : '0100000');

  const linesXml = p.totals.lines.map((l, idx) => `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${xmlEscape(l.unit)}">${l.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${cur}">${l.netAmount.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${cur}">${l.vatAmount.toFixed(2)}</cbc:TaxAmount>
        <cbc:RoundingAmount currencyID="${cur}">${l.totalAmount.toFixed(2)}</cbc:RoundingAmount>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${xmlEscape(l.description)}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>${l.vatCategory}</cbc:ID>
          <cbc:Percent>${l.vatRate}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="${cur}">${l.unitPrice.toFixed(4)}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`).join('');

  const buyerBlock = p.buyer ? `
  <cac:AccountingCustomerParty>
    <cac:Party>
      ${p.buyer.vat ? `<cac:PartyTaxScheme><cbc:CompanyID>${xmlEscape(p.buyer.vat)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity><cbc:RegistrationName>${xmlEscape(p.buyer.name ?? '')}</cbc:RegistrationName></cac:PartyLegalEntity>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(p.buyer.street ?? '')}</cbc:StreetName>
        <cbc:CityName>${xmlEscape(p.buyer.city ?? '')}</cbc:CityName>
        <cbc:PostalZone>${xmlEscape(p.buyer.postal ?? '')}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${xmlEscape(p.buyer.country ?? 'SA')}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${xmlEscape(p.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${p.uuid}</cbc:UUID>
  <cbc:IssueDate>${p.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${p.issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${subtypeName}">${p.invoiceTypeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${cur}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${cur}</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference><cbc:ID>ICV</cbc:ID><cbc:UUID>${p.icv}</cbc:UUID></cac:AdditionalDocumentReference>
  ${p.pih ? `<cac:AdditionalDocumentReference><cbc:ID>PIH</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${p.pih}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>` : ''}
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme><cbc:CompanyID>${xmlEscape(p.seller.vat)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${xmlEscape(p.seller.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(p.seller.street ?? '')}</cbc:StreetName>
        <cbc:CityName>${xmlEscape(p.seller.city ?? '')}</cbc:CityName>
        <cbc:PostalZone>${xmlEscape(p.seller.postal ?? '')}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${xmlEscape(p.seller.country ?? 'SA')}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingSupplierParty>
  ${buyerBlock}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${cur}">${p.totals.vatTotal.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${cur}">${p.totals.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${cur}">${p.totals.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${cur}">${p.totals.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${cur}">${p.totals.discountTotal.toFixed(2)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="${cur}">${p.totals.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${linesXml}
</Invoice>`;
}

export function xmlToBase64(xml: string): string {
  return b64(enc.encode(xml));
}
