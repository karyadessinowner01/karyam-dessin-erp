'use client';

/** Convert an array of objects to a CSV string with proper escaping */
export function toCSV<T extends Record<string, any>>(
  rows: T[],
  columns: { key: keyof T; label: string; format?: (v: any, row: T) => string }[],
): string {
  const escape = (val: any): string => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    // Escape quotes by doubling, wrap in quotes if contains comma/quote/newline
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows
    .map((r) => columns.map((c) => escape(c.format ? c.format(r[c.key], r) : r[c.key])).join(','))
    .join('\n');
  return header + '\n' + body;
}

/** Trigger a CSV download in the browser */
export function downloadCSV(filename: string, csv: string): void {
  // Prepend BOM so Excel reads UTF-8 correctly (e.g. ₹ symbol)
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

/** Convenience: build + download in one call */
export function exportToCSV<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; label: string; format?: (v: any, row: T) => string }[],
): void {
  downloadCSV(filename, toCSV(rows, columns));
}
