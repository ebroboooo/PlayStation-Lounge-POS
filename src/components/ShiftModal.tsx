import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { useTranslation } from '../context/TranslationContext';
import { Landmark, ArrowRightLeft, Sparkles, Printer } from 'lucide-react';
import { ShiftReport } from '../types';
import { ReportService } from '../services/ReportService';

interface ShiftModalProps {
  onClose: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ onClose }) => {
  const { currentShift, openShift, closeShift } = usePOS();
  const { t, language } = useTranslation();
  const [openingInput, setOpeningInput] = useState<number>(0);
  const [actualInput, setActualInput] = useState<number>(0);
  const [summaryReport, setSummaryReport] = useState<ShiftReport | null>(null);

  // Live reconciliation stats while typing actual cash
  const [tempExpected, setTempExpected] = useState<number>(0);
  const [tempDiff, setTempDiff] = useState<number>(0);

  useEffect(() => {
    if (currentShift?.isOpen) {
      // Calculate expected cash in background
      const getStats = async () => {
        const stats = await ReportService.getCurrentShiftReport(currentShift.openingCash, actualInput);
        setTempExpected(stats.expectedCash);
        setTempDiff(stats.difference);
      };
      getStats();
    }
  }, [currentShift, actualInput]);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    await openShift(openingInput);
    onClose();
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const report = await closeShift(actualInput);
    setSummaryReport(report);
  };

  const printShiftReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-zinc-700 shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* If shift is CLOSED (Needs to Open) */}
        {!currentShift?.isOpen && !summaryReport && (
          <form onSubmit={handleOpen}>
            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
                <Landmark className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('openShift')}</h3>
                <p className="text-xs text-zinc-400">
                  {language === 'ar' 
                    ? 'أدخل مبلغ الصندوق الافتتاحي لبدء المعاملات النقشية.'
                    : 'Initialize the cash drawer amount to start recorded transactions.'}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {t('openingCash')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={openingInput || ''}
                  onChange={(e) => setOpeningInput(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full rounded-xl bg-zinc-950 px-10 py-3.5 text-lg font-bold text-white border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-850 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>{t('openShift')}</span>
              </button>
            </div>
          </form>
        )}

        {/* If shift is OPEN (Needs to Close) */}
        {currentShift?.isOpen && !summaryReport && (
          <form onSubmit={handleCloseShift}>
            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-xl bg-rose-500/10 p-3 text-rose-400">
                <Landmark className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('closeShift')}</h3>
                <p className="text-xs text-zinc-400">
                  {language === 'ar'
                    ? 'أدخل المبلغ النقدي الفعلي الموجود بالصندوق للمطابقة.'
                    : 'Count and input the actual physical cash currently in the drawer.'}
                </p>
              </div>
            </div>

            {/* Stats display */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
                <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">{t('openingCash')}</p>
                <p className="text-lg font-extrabold text-white font-mono">${currentShift.openingCash.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-zinc-900 p-4 border border-zinc-800">
                <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">{t('expectedCash')}</p>
                <p className="text-lg font-extrabold text-blue-400 font-mono">${tempExpected.toFixed(2)}</p>
              </div>
            </div>

            {/* Input and live status */}
            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {t('actualCash')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={actualInput || ''}
                  onChange={(e) => setActualInput(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full rounded-xl bg-zinc-950 px-10 py-3.5 text-lg font-bold text-white border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  autoFocus
                />
              </div>

              {/* Difference calculator */}
              <div className="mt-4 flex items-center justify-between px-2">
                <span className="text-xs text-zinc-400">{t('cashDifference')}:</span>
                <span className={`font-mono text-sm font-bold ${
                  tempDiff === 0 
                    ? 'text-emerald-400' 
                    : tempDiff > 0 
                      ? 'text-blue-400' 
                      : 'text-rose-400'
                }`}>
                  {tempDiff >= 0 ? `+$${tempDiff.toFixed(2)}` : `-$${Math.abs(tempDiff).toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-850 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>{t('closeShift')}</span>
              </button>
            </div>
          </form>
        )}

        {/* Shift Reconciliation Summary (After close success) */}
        {summaryReport && (
          <div id="receipt-print-area" className="print:p-0">
            <div className="mb-6 flex items-center gap-4 no-print">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('shiftSummary')}</h3>
                <p className="text-xs text-zinc-400">
                  {language === 'ar' ? 'تمت تسوية الوردية وإغلاقها بنجاح.' : 'Shift successfully reconciled and closed.'}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950 p-6 border border-zinc-850 font-mono text-xs text-zinc-300 space-y-4 shadow-inner">
              <div className="text-center border-b border-zinc-800 pb-3">
                <h2 className="text-sm font-bold text-white">VILLA 30 PLAYSTATION LOUNGE</h2>
                <p className="text-[10px] text-zinc-500 mt-1">SHIFT RECONCILIATION REPORT</p>
                <p className="text-[9px] text-zinc-600 mt-0.5">Date: {new Date().toLocaleString()}</p>
              </div>

              <div className="space-y-2 border-b border-zinc-850 pb-3">
                <div className="flex justify-between">
                  <span>Opening Cash:</span>
                  <span className="text-white">${summaryReport.openingCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shift Revenue:</span>
                  <span className="text-white">${summaryReport.revenue.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 border-b border-zinc-850 pb-3">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Payment Breakdown</p>
                <div className="flex justify-between text-zinc-400">
                  <span>- Cash:</span>
                  <span>${summaryReport.paymentBreakdown.cash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>- Card:</span>
                  <span>${summaryReport.paymentBreakdown.card.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>- Wallet:</span>
                  <span>${summaryReport.paymentBreakdown.wallet.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between font-bold">
                  <span>Expected Drawer Cash:</span>
                  <span className="text-blue-400">${summaryReport.expectedCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Actual Counted Cash:</span>
                  <span className="text-white">${summaryReport.actualCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-850 pt-2 font-bold text-sm">
                  <span>Discrepancy:</span>
                  <span className={summaryReport.difference === 0 ? 'text-emerald-400' : summaryReport.difference > 0 ? 'text-blue-400' : 'text-rose-500'}>
                    ${summaryReport.difference.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 no-print">
              <button
                type="button"
                onClick={printShiftReport}
                className="rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white px-5 py-2.5 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>{t('printReceipt')}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 text-xs font-semibold transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق النافذة' : 'Finish & Exit'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
