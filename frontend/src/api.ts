import type { EntryPayload, FinanceEntry, FinancialSummary } from './types';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');

async function response<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || payload?.detail || payload?.message || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  list: (year: number) => fetch(`${API_BASE}/api/transactions?year=${year}`).then((r) => response<FinanceEntry[]>(r)),
  annual: (year: number) => fetch(`${API_BASE}/api/reports/annual?year=${year}`).then((r) => response<FinancialSummary>(r)),
  create: (data: EntryPayload) => fetch(`${API_BASE}/api/transactions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }).then((r) => response<FinanceEntry>(r)),
  update: (id: number, data: EntryPayload) => fetch(`${API_BASE}/api/transactions/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }).then((r) => response<FinanceEntry>(r)),
  remove: async (id: number) => {
    const res = await fetch(`${API_BASE}/api/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Unable to delete entry (${res.status})`);
  },
  downloadStatement: async (year: number, month: number) => {
    const res = await fetch(`${API_BASE}/api/reports/monthly/${year}/${month}/pdf`);
    if (!res.ok) throw new Error(`Unable to generate statement (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Caturza-Statement-${year}-${String(month).padStart(2, '0')}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
