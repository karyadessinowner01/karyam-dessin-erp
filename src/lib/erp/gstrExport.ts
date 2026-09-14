// gstrExport.ts — GSTR-1 CSV export, GSTR-3B summary, HSN-wise summary
// Karyam Dessin ERP

import type { GSTInvoice } from './types';

export interface GSTR1Row {
  invoiceNo: string;
  date: string;
  partyName: string;
  partyGSTIN: string;
  hsn: string;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  invoiceValue: number;
}

export function generateGSTR1Rows(invoices: GSTInvoice[]): GSTR1Row[] {
  const rows: GSTR1Row[] = [];
  invoices.forEach(inv => {
    inv.items.forEach((item, idx) => {
      const taxable = item.qty * item.rate;
      rows.push({
        invoiceNo: inv.id,
        date: inv.date,
        partyName: inv.clientName,
        partyGSTIN: inv.gstin || '',
        hsn: item.hsn || '998361',
        taxableValue: taxable,
        cgstRate: inv.isInterstate ? 0 : item.gstRate / 2,
        cgstAmount: item.cgst || 0,
        sgstRate: inv.isInterstate ? 0 : item.gstRate / 2,
        sgstAmount: item.sgst || 0,
        igstRate: inv.isInterstate ? item.gstRate : 0,
        igstAmount: item.igst || 0,
        totalTax: (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0),
        invoiceValue: taxable + (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0),
      });
    });
  });
  return rows;
}

export function generateGSTR1CSV(invoices: GSTInvoice[]): string {
  const rows = generateGSTR1Rows(invoices);
  const headers = [
    'Invoice No', 'Date', 'Party Name', 'Party GSTIN', 'HSN/SAC',
    'Taxable Value', 'CGST Rate', 'CGST Amount', 'SGST Rate', 'SGST Amount',
    'IGST Rate', 'IGST Amount', 'Total Tax', 'Invoice Value'
  ];
  const lines = [headers.join(',')];
  rows.forEach(r => {
    lines.push([
      r.invoiceNo, r.date, r.partyName, r.partyGSTIN, r.hsn,
      r.taxableValue, r.cgstRate, r.cgstAmount, r.sgstRate, r.sgstAmount,
      r.igstRate, r.igstAmount, r.totalTax, r.invoiceValue
    ].join(','));
  });
  return lines.join('\n');
}

export interface GSTR3BSummary {
  totalTaxable: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTax: number;
  invoiceCount: number;
}

export function generateGSTR3BSummary(invoices: GSTInvoice[]): GSTR3BSummary {
  return invoices.reduce((acc, inv) => ({
    totalTaxable: acc.totalTaxable + inv.taxableAmount,
    totalCGST: acc.totalCGST + inv.cgst,
    totalSGST: acc.totalSGST + inv.sgst,
    totalIGST: acc.totalIGST + inv.igst,
    totalTax: acc.totalTax + inv.cgst + inv.sgst + inv.igst,
    invoiceCount: acc.invoiceCount + 1,
  }), { totalTaxable: 0, totalCGST: 0, totalSGST: 0, totalIGST: 0, totalTax: 0, invoiceCount: 0 });
}

export interface HSNSummary {
  hsn: string;
  totalTaxable: number;
  totalTax: number;
  count: number;
}

export function generateHSNSummary(invoices: GSTInvoice[]): HSNSummary[] {
  const map: Record<string, HSNSummary> = {};
  invoices.forEach(inv => {
    inv.items.forEach(item => {
      const hsn = item.hsn || '998361';
      if (!map[hsn]) map[hsn] = { hsn, totalTaxable: 0, totalTax: 0, count: 0 };
      map[hsn].totalTaxable += item.qty * item.rate;
      map[hsn].totalTax += (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
      map[hsn].count++;
    });
  });
  return Object.values(map).sort((a, b) => b.totalTaxable - a.totalTaxable);
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
