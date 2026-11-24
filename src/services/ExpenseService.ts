import type { Expense, ExpenseCategory, ExpenseSource, EmployeeRole, Receipt } from '../types';
import { IndexedDBManager } from '../db/db';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['electricity', 'internet', 'stock', 'rent', 'salary', 'maintenance', 'water', 'other'];
export const EXPENSE_SOURCES: ExpenseSource[] = ['drawer', 'external'];

export function isExpense(value: unknown): value is Expense {
  if (!value || typeof value !== 'object') return false;
  const e = value as Expense;
  return typeof e.id === 'string' && e.id.trim().length > 0 &&
    EXPENSE_CATEGORIES.includes(e.category) && EXPENSE_SOURCES.includes(e.source) &&
    typeof e.description === 'string' && e.description.trim().length > 0 && e.description.length <= 300 &&
    Number.isFinite(e.amount) && e.amount > 0 && e.amount <= 1_000_000_000 &&
    Math.abs(e.amount * 100 - Math.round(e.amount * 100)) < 0.0001 &&
    Number.isSafeInteger(e.timestamp) && e.timestamp > 0 &&
    Number.isSafeInteger(e.createdAt) && e.createdAt >= e.timestamp;
}

export function summarizeCashFlow(receipts: Receipt[], expenses: Expense[], from: number, to: number) {
  const inPeriod = (x: { timestamp: number }) => x.timestamp >= from && x.timestamp <= to;
  const revenue = receipts.filter(inPeriod).reduce((n, r) => n + Math.round(r.total * 100), 0);
  const paid = expenses.filter(inPeriod);
  const total = paid.reduce((n, e) => n + Math.round(e.amount * 100), 0);
  const drawer = paid.filter(e => e.source === 'drawer').reduce((n, e) => n + Math.round(e.amount * 100), 0);
  return { revenue: revenue / 100, expenses: total / 100, drawerExpenses: drawer / 100, net: (revenue - total) / 100 };
}

export class ExpenseService {
  static async getAll(): Promise<Expense[]> {
    return (await IndexedDBManager.getAll<Expense>('expenses')).sort((a,b) => b.timestamp - a.timestamp);
  }

  static async record(input: Pick<Expense, 'category' | 'source' | 'amount' | 'description'>, role: EmployeeRole, shiftOpen: boolean): Promise<Expense> {
    if (role !== 'admin') throw new Error('Administrator access required');
    if (input.source === 'drawer' && !shiftOpen) throw new Error('Open a cashier shift before paying from the drawer');
    const now = Date.now();
    const expense: Expense = { ...input, description: input.description.trim(), id: crypto.randomUUID(), timestamp: now, createdAt: now };
    if (!isExpense(expense)) throw new Error('Invalid expense. Enter a positive amount with at most two decimal places and a description.');
    const db = await IndexedDBManager.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['expenses', 'audit_logs'], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Expense transaction aborted'));
      try {
        tx.objectStore('expenses').add(expense);
        tx.objectStore('audit_logs').add({ id: 'expense-' + expense.id, timestamp: now, employeeRole: role, action: 'Record Expense', details: expense.category + ': ' + expense.amount.toFixed(2) + ' (' + expense.source + ') — ' + expense.description });
      } catch (error) {
        try { tx.abort(); } catch { /* already aborted */ }
        reject(error);
      }
    });
    return expense;
  }
}
