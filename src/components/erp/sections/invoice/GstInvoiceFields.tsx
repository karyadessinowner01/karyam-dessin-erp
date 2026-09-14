'use client';
// GstInvoiceFields.tsx
// Karyam Dessin ERP — Extended GST fields to embed inside your existing Invoice/Quotation form
// Drop into: /components/invoice/GstInvoiceFields.tsx
//
// This is a SECTION component — render it inside your invoice form, and lift
// `gstData` state up to your parent invoice form so it saves along with the rest.

import { STATE_LIST, isValidGSTIN, calculateTaxSplit, calculateRoundOff } from "@/lib/erp/gstUtils";

export interface GstInvoiceData {
  // e-Invoice
  eInvoiceApplicable: boolean;
  irn?: string; // Invoice Reference Number (from GST portal after e-invoice generation)
  qrCodeData?: string; // base64 or URL of the e-invoice QR

  // e-Way Bill
  eWayBillRequired: boolean;
  eWayBillNumber?: string;

  // Reverse Charge
  reverseCharge: boolean;

  // Place of Supply / addresses
  placeOfSupplyCode: string; // 2-digit state code
  supplierStateCode: string; // your company's state code
  billingAddress: string;
  shippingAddress: string;
  shippingSameAsBilling: boolean;

  // TDS / TCS
  tdsApplicable: boolean;
  tdsRate?: number; // %
  tdsAmount?: number;
  tcsApplicable: boolean;
  tcsRate?: number;
  tcsAmount?: number;

  // Credit / Debit Note
  documentType: "Invoice" | "Credit Note" | "Debit Note";
  originalInvoiceRef?: string; // required if Credit/Debit Note

  // Advance receipt
  isAdvanceReceipt: boolean;
}

export const EMPTY_GST_DATA: GstInvoiceData = {
  eInvoiceApplicable: false,
  eWayBillRequired: false,
  reverseCharge: false,
  placeOfSupplyCode: "",
  supplierStateCode: "09", // default: Uttar Pradesh — change to your actual registered state
  billingAddress: "",
  shippingAddress: "",
  shippingSameAsBilling: true,
  tdsApplicable: false,
  tcsApplicable: false,
  documentType: "Invoice",
  isAdvanceReceipt: false,
};

interface Props {
  data: GstInvoiceData;
  onChange: (data: GstInvoiceData) => void;
  buyerGSTIN?: string;
  taxableValue: number;
  gstRate: number; // total GST %, e.g. 18
}

export default function GstInvoiceFields({ data, onChange, buyerGSTIN, taxableValue, gstRate }: Props) {
  function set<K extends keyof GstInvoiceData>(key: K, value: GstInvoiceData[K]) {
    onChange({ ...data, [key]: value });
  }

  const taxSplit =
    data.placeOfSupplyCode && data.supplierStateCode
      ? calculateTaxSplit(data.supplierStateCode, data.placeOfSupplyCode, taxableValue, gstRate)
      : null;

  const grandTotalBeforeRound = taxSplit
    ? taxableValue + taxSplit.igstAmount + taxSplit.cgstAmount + taxSplit.sgstAmount
    : taxableValue;
  const rounding = calculateRoundOff(grandTotalBeforeRound);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginTop: 16 }}>
      <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>GST & Compliance Details</h4>

      {/* Document Type */}
      <Row label="Document Type">
        <select style={inputStyle} value={data.documentType} onChange={(e) => set("documentType", e.target.value as any)}>
          <option value="Invoice">Tax Invoice</option>
          <option value="Credit Note">Credit Note</option>
          <option value="Debit Note">Debit Note</option>
        </select>
      </Row>

      {(data.documentType === "Credit Note" || data.documentType === "Debit Note") && (
        <Row label="Original Invoice Number (reference)">
          <input
            style={inputStyle}
            value={data.originalInvoiceRef || ""}
            onChange={(e) => set("originalInvoiceRef", e.target.value)}
            placeholder="e.g. KD/2026-27/0045"
          />
        </Row>
      )}

      {/* Place of supply */}
      <Row label="Place of Supply (Buyer's State)">
        <select
          style={inputStyle}
          value={data.placeOfSupplyCode}
          onChange={(e) => set("placeOfSupplyCode", e.target.value)}
        >
          <option value="">-- Select State --</option>
          {STATE_LIST.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </Row>

      {taxSplit && (
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, fontSize: 13, marginBottom: 12 }}>
          <div>Tax Type: <strong>{taxSplit.isInterState ? "IGST (Inter-state)" : "CGST + SGST (Intra-state)"}</strong></div>
          {taxSplit.isInterState ? (
            <div>IGST @ {taxSplit.igstRate}% = ₹{taxSplit.igstAmount.toFixed(2)}</div>
          ) : (
            <>
              <div>CGST @ {taxSplit.cgstRate}% = ₹{taxSplit.cgstAmount.toFixed(2)}</div>
              <div>SGST @ {taxSplit.sgstRate}% = ₹{taxSplit.sgstAmount.toFixed(2)}</div>
            </>
          )}
          <div style={{ marginTop: 6, borderTop: "1px solid #e5e7eb", paddingTop: 6 }}>
            Round-off: {rounding.roundOffAmount >= 0 ? "+" : ""}
            {rounding.roundOffAmount.toFixed(2)} → <strong>Final Total: ₹{rounding.roundedTotal.toFixed(2)}</strong>
          </div>
        </div>
      )}

      {/* Billing / Shipping */}
      <Row label="Billing Address">
        <textarea
          style={{ ...inputStyle, height: 60 }}
          value={data.billingAddress}
          onChange={(e) => set("billingAddress", e.target.value)}
        />
      </Row>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={data.shippingSameAsBilling}
          onChange={(e) => set("shippingSameAsBilling", e.target.checked)}
        />
        Shipping address same as billing
      </label>
      {!data.shippingSameAsBilling && (
        <Row label="Shipping Address">
          <textarea
            style={{ ...inputStyle, height: 60 }}
            value={data.shippingAddress}
            onChange={(e) => set("shippingAddress", e.target.value)}
          />
        </Row>
      )}

      {/* Reverse Charge */}
      <Checkbox
        label="Reverse Charge Mechanism (RCM) applicable"
        checked={data.reverseCharge}
        onChange={(v) => set("reverseCharge", v)}
      />

      {/* Advance receipt */}
      <Checkbox
        label="This is an Advance Receipt (tax on advance payment)"
        checked={data.isAdvanceReceipt}
        onChange={(v) => set("isAdvanceReceipt", v)}
      />

      {/* e-Invoice */}
      <Checkbox
        label="e-Invoice applicable (turnover > ₹5 Cr) — generate IRN"
        checked={data.eInvoiceApplicable}
        onChange={(v) => set("eInvoiceApplicable", v)}
      />
      {data.eInvoiceApplicable && (
        <Row label="IRN (Invoice Reference Number)">
          <input
            style={inputStyle}
            value={data.irn || ""}
            onChange={(e) => set("irn", e.target.value)}
            placeholder="64-character IRN from GST portal"
          />
        </Row>
      )}

      {/* e-Way Bill */}
      <Checkbox
        label="e-Way Bill required (goods value > ₹50,000)"
        checked={data.eWayBillRequired}
        onChange={(v) => set("eWayBillRequired", v)}
      />
      {data.eWayBillRequired && (
        <Row label="e-Way Bill Number">
          <input
            style={inputStyle}
            value={data.eWayBillNumber || ""}
            onChange={(e) => set("eWayBillNumber", e.target.value)}
            placeholder="12-digit EWB number"
          />
        </Row>
      )}

      {/* TDS */}
      <Checkbox label="TDS applicable" checked={data.tdsApplicable} onChange={(v) => set("tdsApplicable", v)} />
      {data.tdsApplicable && (
        <Row label="TDS Rate (%)">
          <input
            type="number"
            style={inputStyle}
            value={data.tdsRate || ""}
            onChange={(e) => set("tdsRate", parseFloat(e.target.value))}
          />
        </Row>
      )}

      {/* TCS */}
      <Checkbox label="TCS applicable" checked={data.tcsApplicable} onChange={(v) => set("tcsApplicable", v)} />
      {data.tcsApplicable && (
        <Row label="TCS Rate (%)">
          <input
            type="number"
            style={inputStyle}
            value={data.tcsRate || ""}
            onChange={(e) => set("tcsRate", parseFloat(e.target.value))}
          />
        </Row>
      )}

      {buyerGSTIN && !isValidGSTIN(buyerGSTIN) && (
        <div style={{ background: "#fffbeb", color: "#92400e", padding: 10, borderRadius: 8, fontSize: 13, marginTop: 8 }}>
          ⚠️ Buyer ka GSTIN format galat lag raha hai, dubara check karo.
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 10 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
};
