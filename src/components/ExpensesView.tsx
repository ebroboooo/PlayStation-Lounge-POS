import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { useRole } from '../context/RoleContext';
import { useTranslation } from '../context/TranslationContext';
import { EXPENSE_CATEGORIES, summarizeCashFlow } from '../services/ExpenseService';
import type { ExpenseCategory, ExpenseSource } from '../types';

const labels: Record<ExpenseCategory, [string, string]> = {
  electricity: ['Electricity', 'الكهرباء'], internet: ['Internet', 'الإنترنت'],
  stock: ['Stock purchases', 'مشتريات المخزون'], rent: ['Rent', 'الإيجار'],
  salary: ['Salaries', 'الرواتب'], maintenance: ['Maintenance', 'الصيانة'],
  water: ['Water', 'المياه'], other: ['Other', 'أخرى']
};
const field = 'w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-white';

export const CashFlowSummary: React.FC = () => {
  const { receipts, expenses, settings } = usePOS();
  const { language } = useTranslation();
  const { role } = useRole();
  if (role !== 'admin') return null;
  const ar = language === 'ar';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const periods = [
    [ar ? 'اليوم' : 'Today', summarizeCashFlow(receipts, expenses, today, now.getTime())],
    [ar ? 'هذا الشهر' : 'This month', summarizeCashFlow(receipts, expenses, month, now.getTime())]
  ] as const;
  return <section className="glass-panel rounded-2xl border border-zinc-800 p-5 space-y-4">
    <h3 className="text-lg font-bold text-white">{ar ? 'ملخص التدفقات النقدية' : 'Cash flow summary'}</h3>
    <div className="grid gap-4 md:grid-cols-2">{periods.map(([label, summary]) =>
      <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
        <h4 className="text-sm font-bold text-white">{label}</h4>
        <div className="flex justify-between text-sm text-zinc-300"><span>{ar ? 'إيرادات المبيعات' : 'Sales revenue'}</span><span>{summary.revenue.toFixed(2)} {settings.currency}</span></div>
        <div className="flex justify-between text-sm text-rose-400"><span>{ar ? 'المصروفات المدفوعة' : 'Paid expenses'}</span><span>{summary.expenses.toFixed(2)} {settings.currency}</span></div>
        <div className="flex justify-between border-t border-zinc-800 pt-2 font-bold"><span>{ar ? 'صافي التدفق' : 'Net cash flow'}</span><span className={summary.net < 0 ? 'text-rose-400' : 'text-emerald-400'}>{summary.net.toFixed(2)} {settings.currency}</span></div>
      </div>)}</div>
    <p className="text-xs text-zinc-400">{ar ? 'المبيعات ناقص المدفوعات المسجلة، وليس صافي الربح المحاسبي. لا تخصم تكلفة المخزون مرتين.' : 'Sales minus recorded payments, not accounting profit. Stock purchases are counted once when paid.'}</p>
  </section>;
};

export const ExpensesView: React.FC = () => {
  const { expenses, recordExpense, settings, currentShift } = usePOS();
  const { role } = useRole();
  const { language } = useTranslation();
  const ar = language === 'ar';
  const [category, setCategory] = useState<ExpenseCategory>('electricity');
  const [source, setSource] = useState<ExpenseSource>('drawer');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  if (role !== 'admin') return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await recordExpense({ category, source, amount: Number(amount), description });
      setAmount(''); setDescription('');
      setMessage(ar ? 'تم تسجيل المصروف' : 'Expense recorded');
    } catch (e) {
      setError(ar ? 'تعذر تسجيل المصروف. تحقق من المبلغ والوصف والوردية.' : (e instanceof Error ? e.message : 'Unable to record expense'));
    } finally { setBusy(false); }
  };
  return <div className="h-full overflow-y-auto p-6 space-y-6">
    <h2 className="text-xl font-extrabold text-white">{ar ? 'المصروفات' : 'Expenses'}</h2>
    <CashFlowSummary />
    <form onSubmit={submit} className="glass-panel rounded-2xl border border-zinc-800 p-5 space-y-4">
      <h3 className="font-bold text-white">{ar ? 'تسجيل مصروف مدفوع الآن' : 'Record a payment made now'}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs text-zinc-300 space-y-1"><span>{ar ? 'الفئة' : 'Category'}</span><select className={field} value={category} onChange={e=>setCategory(e.target.value as ExpenseCategory)}>{EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{labels[c][ar?1:0]}</option>)}</select></label>
        <label className="text-xs text-zinc-300 space-y-1"><span>{ar ? 'مصدر الدفع' : 'Payment source'}</span><select className={field} value={source} onChange={e=>setSource(e.target.value as ExpenseSource)}><option value="drawer">{ar ? 'من درج الكاشير' : 'Cash drawer'}</option><option value="external">{ar ? 'خارج درج الكاشير (مالك / بنك / محفظة)' : 'Outside drawer (owner / bank / wallet)'}</option></select></label>
        <label className="text-xs text-zinc-300 space-y-1"><span>{ar ? 'المبلغ' : 'Amount'} ({settings.currency})</span><input className={field} type="number" min="0.01" max="1000000000" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/></label>
        <label className="text-xs text-zinc-300 space-y-1"><span>{ar ? 'الوصف / رقم الإيصال' : 'Description / reference'}</span><input className={field} maxLength={300} required value={description} onChange={e=>setDescription(e.target.value)}/></label>
      </div>
      <p className="text-xs text-zinc-400">{ar ? 'مشتريات المخزون تسجل هنا كمصروف، وتحدث الكميات يدوياً من المخزون. الدفع الخارجي لا يخصم من عهدة الكاشير.' : 'Record stock purchases here; update quantities separately in Inventory. External payments do not reduce the cash drawer.'}</p>
      <button disabled={busy || (source==='drawer' && !currentShift?.isOpen)} className="rounded-xl bg-purple-600 px-5 py-2 text-white font-bold text-sm disabled:opacity-50">{busy ? (ar?'جار الحفظ':'Saving…') : (ar?'حفظ المصروف':'Save expense')}</button>
      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}{message && <p role="status" className="text-sm text-emerald-400">{message}</p>}
    </form>
    <section className="glass-panel rounded-2xl border border-zinc-800 p-5 overflow-x-auto">
      <h3 className="font-bold mb-4 text-white">{ar ? 'سجل المصروفات' : 'Expense history'}</h3>
      {expenses.length === 0 ? <p className="text-zinc-400 text-sm">{ar ? 'لا توجد مصروفات' : 'No expenses recorded'}</p> :
      <table className="w-full text-sm text-start"><thead className="text-zinc-400"><tr>{(ar?['التاريخ','الفئة','الوصف','المصدر','المبلغ']:['Date','Category','Description','Source','Amount']).map(h=><th key={h} className="p-2 text-start">{h}</th>)}</tr></thead><tbody>{expenses.map(e=><tr key={e.id} className="border-t border-zinc-800 text-zinc-200"><td className="p-2">{new Date(e.timestamp).toLocaleString(ar?'ar-EG':'en-GB')}</td><td className="p-2">{labels[e.category][ar?1:0]}</td><td className="p-2 break-words">{e.description}</td><td className="p-2">{e.source==='drawer'?(ar?'الدرج':'Drawer'):(ar?'خارجي':'External')}</td><td className="p-2 text-rose-400 whitespace-nowrap">{e.amount.toFixed(2)} {settings.currency}</td></tr>)}</tbody></table>}
    </section>
  </div>;
};
