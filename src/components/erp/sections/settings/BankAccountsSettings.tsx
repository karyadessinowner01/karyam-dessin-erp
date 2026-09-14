'use client';
// BankAccountsSettings.tsx
// Karyam Dessin ERP — Settings > Bank Accounts (multiple accounts, select-on-invoice)
// Drop into: /components/settings/BankAccountsSettings.tsx
// Route it e.g. at /settings/bank-accounts
//
// IMPORTANT: adjust the firebase import path below to match your project
// e.g. import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";

export interface BankAccount {
  id?: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  accountType: "Current" | "Savings";
  upiId?: string;
  isDefault: boolean;
  createdAt?: number;
}

const EMPTY_ACCOUNT: BankAccount = {
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  branch: "",
  accountType: "Current",
  upiId: "",
  isDefault: false,
};

// Firestore path: companies/{companyId}/bankAccounts
// If your app is single-tenant, just use collection(db, "bankAccounts") instead.
const COMPANY_ID = "karyam-dessin";

function getBankAccountsCollection() {
  if (!db || !isFirebaseConfigured()) return null;
  return collection(db, "companies", COMPANY_ID, "bankAccounts");
}

const BANK_LS_KEY = 'kard-erp-bank-accounts';

function getLocalAccounts(): BankAccount[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(BANK_LS_KEY) || '[]'); } catch { return []; }
}

function saveLocalAccounts(list: BankAccount[]) {
  if (typeof window !== 'undefined') localStorage.setItem(BANK_LS_KEY, JSON.stringify(list));
}

export default function BankAccountsSettings() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured() || !db) {
      // LocalStorage fallback
      setAccounts(getLocalAccounts());
      setLoading(false);
      return;
    }
    const colRef = getBankAccountsCollection();
    if (!colRef) { setAccounts(getLocalAccounts()); setLoading(false); return; }
    const q = query(colRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: BankAccount[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as BankAccount),
        }));
        setAccounts(list);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  function openAddForm() {
    setEditing({ ...EMPTY_ACCOUNT });
    setShowForm(true);
  }

  function openEditForm(acc: BankAccount) {
    setEditing({ ...acc });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setError(null);
  }

  function validate(acc: BankAccount): string | null {
    if (!acc.accountHolderName.trim()) return "Account holder name required hai";
    if (!acc.bankName.trim()) return "Bank name required hai";
    if (!/^\d{6,20}$/.test(acc.accountNumber.trim()))
      return "Account number sahi format mein daalo (6-20 digits)";
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(acc.ifscCode.trim()))
      return "IFSC code galat hai (e.g. SBIN0001234)";
    if (!acc.branch.trim()) return "Branch name required hai";
    return null;
  }

  async function handleSave() {
    if (!editing) return;
    const validationError = validate(editing);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (!isFirebaseConfigured() || !db) {
        // LocalStorage fallback
        const localList = getLocalAccounts();
        if (editing.isDefault) localList.forEach(a => a.isDefault = false);
        if (editing.id) {
          const idx = localList.findIndex(a => a.id === editing.id);
          if (idx >= 0) localList[idx] = editing;
        } else {
          editing.id = 'local-' + Date.now();
          editing.createdAt = Date.now();
          if (localList.length === 0) editing.isDefault = true;
          localList.unshift(editing);
        }
        saveLocalAccounts(localList);
        setAccounts([...localList]);
        closeForm();
        return;
      }
      const colRef = getBankAccountsCollection();
      if (!colRef) { setError('Firebase not configured'); return; }

      // If this account is being set as default, un-default all others first
      if (editing.isDefault) {
        const batch = writeBatch(db);
        accounts.forEach((acc) => {
          if (acc.id && acc.id !== editing.id && acc.isDefault) {
            batch.update(doc(colRef, acc.id), { isDefault: false });
          }
        });
        await batch.commit();
      }

      if (editing.id) {
        // update existing
        const { id, ...data } = editing;
        await updateDoc(doc(colRef, id), { ...data });
      } else {
        // if this is the very first account, force default = true
        const isFirstAccount = accounts.length === 0;
        await addDoc(colRef, {
          ...editing,
          isDefault: editing.isDefault || isFirstAccount,
          createdAt: Date.now(),
        });
      }
      closeForm();
    } catch (e: any) {
      setError(e.message || "Save karne mein error aayi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(acc: BankAccount) {
    if (!acc.id) return;
    if (!confirm(`"${acc.bankName} - ${acc.accountNumber}" delete karna hai?`)) return;
    try {
      if (!isFirebaseConfigured() || !db) {
        const localList = getLocalAccounts().filter(a => a.id !== acc.id);
        saveLocalAccounts(localList);
        setAccounts([...localList]);
        return;
      }
      const colRef = getBankAccountsCollection();
      if (!colRef) return;
      await deleteDoc(doc(colRef, acc.id));
    } catch (e: any) {
      alert("Delete nahi ho paya: " + e.message);
    }
  }

  async function handleSetDefault(acc: BankAccount) {
    if (!acc.id) return;
    try {
      if (!isFirebaseConfigured() || !db) {
        // LocalStorage fallback
        const localList = getLocalAccounts();
        if (editing.isDefault) localList.forEach(a => a.isDefault = false);
        if (editing.id) {
          const idx = localList.findIndex(a => a.id === editing.id);
          if (idx >= 0) localList[idx] = editing;
        } else {
          editing.id = 'local-' + Date.now();
          editing.createdAt = Date.now();
          if (localList.length === 0) editing.isDefault = true;
          localList.unshift(editing);
        }
        saveLocalAccounts(localList);
        setAccounts([...localList]);
        closeForm();
        return;
      }
      const colRef = getBankAccountsCollection();
      if (!colRef) { setError('Firebase not configured'); return; }
      const batch = writeBatch(db);
      accounts.forEach((a) => {
        if (a.id) {
          batch.update(doc(colRef, a.id), { isDefault: a.id === acc.id });
        }
      });
      await batch.commit();
    } catch (e: any) {
      alert("Default set karne mein error: " + e.message);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Bank Accounts</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            Multiple bank accounts add karo, invoice banate waqt inme se select kar sakte ho.
          </p>
        </div>
        <button
          onClick={openAddForm}
          style={{
            background: "#111827",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add Bank Account
        </button>
      </div>

      {loading && <p style={{ color: "#6b7280" }}>Loading...</p>}
      {!loading && accounts.length === 0 && (
        <div
          style={{
            border: "1px dashed #d1d5db",
            borderRadius: 12,
            padding: 40,
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          Abhi koi bank account add nahi hua. "+ Add Bank Account" pe click karo.
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {accounts.map((acc) => (
          <div
            key={acc.id}
            style={{
              border: acc.isDefault ? "2px solid #111827" : "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              background: "#fff",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 16 }}>{acc.bankName}</strong>
                {acc.isDefault && (
                  <span
                    style={{
                      fontSize: 11,
                      background: "#111827",
                      color: "#fff",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontWeight: 600,
                    }}
                  >
                    DEFAULT
                  </span>
                )}
              </div>
              <div style={{ color: "#374151", fontSize: 14, marginTop: 4 }}>
                {acc.accountHolderName} · A/C {acc.accountNumber}
              </div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>
                IFSC: {acc.ifscCode} · {acc.branch} · {acc.accountType}
                {acc.upiId ? ` · UPI: ${acc.upiId}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!acc.isDefault && (
                <button
                  onClick={() => handleSetDefault(acc)}
                  style={btnStyleSecondary}
                >
                  Set Default
                </button>
              )}
              <button onClick={() => openEditForm(acc)} style={btnStyleSecondary}>
                Edit
              </button>
              <button
                onClick={() => handleDelete(acc)}
                style={{ ...btnStyleSecondary, color: "#dc2626", borderColor: "#fecaca" }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={closeForm}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 24,
              width: 460,
              maxWidth: "90vw",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ marginTop: 0 }}>{editing.id ? "Edit Bank Account" : "Add Bank Account"}</h3>

            {error && (
              <div style={{ background: "#fef2f2", color: "#991b1b", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                {error}
              </div>
            )}

            <Field label="Account Holder Name">
              <input
                style={inputStyle}
                value={editing.accountHolderName}
                onChange={(e) => setEditing({ ...editing, accountHolderName: e.target.value })}
                placeholder="Karyam Dessin"
              />
            </Field>
            <Field label="Bank Name">
              <input
                style={inputStyle}
                value={editing.bankName}
                onChange={(e) => setEditing({ ...editing, bankName: e.target.value })}
                placeholder="State Bank of India"
              />
            </Field>
            <Field label="Account Number">
              <input
                style={inputStyle}
                value={editing.accountNumber}
                onChange={(e) => setEditing({ ...editing, accountNumber: e.target.value.replace(/\D/g, "") })}
                placeholder="1234567890"
              />
            </Field>
            <Field label="IFSC Code">
              <input
                style={inputStyle}
                value={editing.ifscCode}
                onChange={(e) => setEditing({ ...editing, ifscCode: e.target.value.toUpperCase() })}
                placeholder="SBIN0001234"
              />
            </Field>
            <Field label="Branch">
              <input
                style={inputStyle}
                value={editing.branch}
                onChange={(e) => setEditing({ ...editing, branch: e.target.value })}
                placeholder="Hazratganj, Lucknow"
              />
            </Field>
            <Field label="Account Type">
              <select
                style={inputStyle}
                value={editing.accountType}
                onChange={(e) => setEditing({ ...editing, accountType: e.target.value as "Current" | "Savings" })}
              >
                <option value="Current">Current</option>
                <option value="Savings">Savings</option>
              </select>
            </Field>
            <Field label="UPI ID (optional — for QR on invoice)">
              <input
                style={inputStyle}
                value={editing.upiId}
                onChange={(e) => setEditing({ ...editing, upiId: e.target.value })}
                placeholder="karyamdessin@sbi"
              />
            </Field>
            <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 20px", fontSize: 14 }}>
              <input
                type="checkbox"
                checked={editing.isDefault}
                onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
              />
              Isko default account banao (invoice pe by-default ye dikhega)
            </label>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={closeForm} style={btnStyleSecondary}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: "#111827",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
        {label}
      </label>
      {children}
    </div>
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

const btnStyleSecondary: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  color: "#374151",
};

// ---------------------------------------------------------------------------
// USE ON INVOICE: a small dropdown to pick which bank account shows on an invoice
// ---------------------------------------------------------------------------
export function BankAccountSelector({
  accounts,
  selectedId,
  onChange,
}: {
  accounts: BankAccount[];
  selectedId?: string;
  onChange: (acc: BankAccount) => void;
}) {
  return (
    <select
      style={inputStyle}
      value={selectedId || accounts.find((a) => a.isDefault)?.id || ""}
      onChange={(e) => {
        const acc = accounts.find((a) => a.id === e.target.value);
        if (acc) onChange(acc);
      }}
    >
      {accounts.map((acc) => (
        <option key={acc.id} value={acc.id}>
          {acc.bankName} - {acc.accountNumber} {acc.isDefault ? "(Default)" : ""}
        </option>
      ))}
    </select>
  );
}
