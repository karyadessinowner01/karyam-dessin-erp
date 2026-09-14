// gstUtils.ts — Karyam Dessin ERP
// GSTIN validation, state codes, IGST/CGST/SGST auto-split, round-off, e-invoice/e-way bill thresholds

export interface StateInfo {
  code: string;
  name: string;
}

export const STATE_LIST: StateInfo[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "25", name: "Daman & Diu" },
  { code: "26", name: "Dadra & Nagar Haveli" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh (Old)" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
];

export function isValidGSTIN(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
}

export interface TaxSplit {
  isInterState: boolean;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
}

export function calculateTaxSplit(
  supplierStateCode: string,
  buyerStateCode: string,
  taxableValue: number,
  gstRate: number
): TaxSplit {
  const isInterState = supplierStateCode !== buyerStateCode;
  if (isInterState) {
    return {
      isInterState: true,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: gstRate,
      igstAmount: Math.round(taxableValue * gstRate) / 100,
    };
  }
  const halfRate = gstRate / 2;
  const halfAmount = Math.round(taxableValue * halfRate) / 100;
  return {
    isInterState: false,
    cgstRate: halfRate,
    cgstAmount: halfAmount,
    sgstRate: halfRate,
    sgstAmount: halfAmount,
    igstRate: 0,
    igstAmount: 0,
  };
}

export interface RoundOffResult {
  roundedTotal: number;
  roundOffAmount: number;
}

export function calculateRoundOff(amount: number): RoundOffResult {
  const rounded = Math.round(amount);
  return {
    roundedTotal: rounded,
    roundOffAmount: Math.round((rounded - amount) * 100) / 100,
  };
}

export const E_INVOICE_THRESHOLD = 50000000; // ₹5 Cr
export const E_WAY_BILL_THRESHOLD = 50000; // ₹50,000

export function isEInvoiceApplicable(turnover: number): boolean {
  return turnover >= E_INVOICE_THRESHOLD;
}

export function isEWayBillRequired(goodsValue: number): boolean {
  return goodsValue >= E_WAY_BILL_THRESHOLD;
}

export function getStateName(code: string): string {
  return STATE_LIST.find(s => s.code === code)?.name || "Unknown";
}
