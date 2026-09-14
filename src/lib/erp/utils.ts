import { STATUS_BADGES, DEPT_LABELS, DEPT_BADGE } from './constants';

/** Format currency in INR */
export function Rs(n: number | undefined | null): string {
  const v = Number(n || 0);
  return '\u20B9' + v.toLocaleString('en-IN');
}

/** Format a YYYY-MM-DD date as DD-Mon-YY */
export function fD(d: string | null | undefined): string {
  if (!d || d === '-') return '-';
  const p = d.split('-');
  if (p.length !== 3) return d;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${p[2]}-${months[+p[1] - 1]}-${p[0].slice(2)}`;
}

/** Today as YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/** Current time as HH:MM */
export function now(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Generate a sequential id with prefix, e.g. KD-0001 */
export function gId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

/** Get status badge classes */
export function badgeClass(status: string): string {
  const k = (status || '').toLowerCase();
  return STATUS_BADGES[k] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

export function deptLabel(d: string): string {
  return DEPT_LABELS[d] || d;
}

export function deptBadgeClass(d: string): string {
  return DEPT_BADGE[d] || DEPT_BADGE.owner;
}

export function activityNow(name: string): string {
  return name.split(' ')[0];
}

/** Extract month label "Mar 2025" from a YYYY-MM-DD date */
export function monthLabel(d: string): string {
  if (!d || d === '-') return '-';
  const p = d.split('-');
  if (p.length !== 3) return d;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[+p[1] - 1]} ${p[0]}`;
}

/** Extract year from YYYY-MM-DD */
export function yearOf(d: string): string {
  if (!d) return '-';
  return d.split('-')[0];
}

/** In-place filter helper for table search */
export function matchSearch(text: string, q: string): boolean {
  return !q || text.toLowerCase().includes(q.toLowerCase());
}

/** Inr words (simple) — optional helper for invoices */
export function inrWords(num: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  };
  if (num === 0) return 'Zero';
  return inWords(Math.floor(num)) + ' Only';
}
