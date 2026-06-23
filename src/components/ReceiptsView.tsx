import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { useTranslation } from '../context/TranslationContext';
import { Receipt } from '../types';
import { Search, Printer, Calendar, User, Gamepad2, X, Clipboard } from 'lucide-react';

export const ReceiptsView: React.FC = () => {
  const { receipts, settings } = usePOS();
  const { t, language } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Search filter
  const filteredReceipts = receipts.filter(rcpt => {
    const query = searchQuery.toLowerCase();
    const dateStr = new Date(rcpt.timestamp).toLocaleDateString();
    
    return (
      rcpt.receiptNumber.toLowerCase().includes(query) ||
      (rcpt.customerName && rcpt.customerName.toLowerCase().includes(query)) ||
      rcpt.roomName.toLowerCase().includes(query) ||
      (rcpt.notes && rcpt.notes.toLowerCase().includes(query)) ||
      dateStr.includes(query)
    );
  });

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (language === 'ar') {
      return `${hrs} س ${mins} د ${secs} ث`;
    }
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 h-full overflow-y-auto">
      
      {/* Left: Receipts Search list */}
      <div className="flex-1 space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-white leading-tight">{t('receipts')}</h2>
          <p className="text-xs text-zinc-400">Search and reprint historical customer invoices.</p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4.5 w-4.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchReceipts')}
            className="w-full rounded-xl bg-zinc-950 pl-10 pr-4 py-2.5 text-xs text-white border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-purple-500 font-semibold"
          />
        </div>

        {/* Receipts List */}
        <div className="glass-panel rounded-2xl border border-zinc-800 overflow-hidden max-h-[calc(100vh-14rem)] overflow-y-auto space-y-1">
          {filteredReceipts.length > 0 ? (
            filteredReceipts.map(rcpt => {
              const isSelected = selectedReceipt?.receiptNumber === rcpt.receiptNumber;
              return (
                <button
                  key={rcpt.receiptNumber}
                  onClick={() => setSelectedReceipt(rcpt)}
                  className={`w-full flex items-center justify-between p-4 text-left border-b border-zinc-900/60 last:border-0 hover:bg-zinc-900/10 transition-colors cursor-pointer ${
                    isSelected ? 'bg-purple-600/10 border-l-4 border-l-purple-500' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-mono font-bold text-white">{rcpt.receiptNumber}</h4>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Gamepad2 className="h-3 w-3" />
                        <span>{rcpt.roomName}</span>
                      </span>
                      {rcpt.customerName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{rcpt.customerName}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(rcpt.timestamp).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>

                  <span className="text-sm font-extrabold text-purple-400 font-mono">
                    ${rcpt.total.toFixed(2)}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs">
              {t('noData')}
            </div>
          )}
        </div>
      </div>

      {/* Right: Master-Detail Viewer panel */}
      {selectedReceipt && (
        <div className="w-full lg:w-96 glass-panel rounded-2xl border border-zinc-800 p-6 flex flex-col justify-between h-fit animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {selectedReceipt.receiptNumber}
              </h3>
              <button 
                onClick={() => setSelectedReceipt(null)} 
                className="text-zinc-500 hover:text-white cursor-pointer no-print"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Simulated Receipt Preview for the user */}
            <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-900 text-xs font-mono text-zinc-300 space-y-4">
              <div className="text-center border-b border-zinc-900 pb-2">
                <h4 className="text-white font-bold">{settings.businessName}</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">{new Date(selectedReceipt.timestamp).toLocaleString()}</p>
              </div>

              <div className="space-y-1 text-[11px] border-b border-zinc-900 pb-2">
                <div className="flex justify-between">
                  <span>Room Name:</span>
                  <span className="text-white font-bold">{selectedReceipt.roomName}</span>
                </div>
                {selectedReceipt.customerName && (
                  <div className="flex justify-between">
                    <span>Customer Name:</span>
                    <span className="text-white font-bold">{selectedReceipt.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="text-white font-bold">{formatDuration(selectedReceipt.duration)}</span>
                </div>
              </div>

              {/* Items List */}
              {selectedReceipt.items.length > 0 && (
                <div className="border-b border-zinc-900 pb-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Items Ordered</span>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {selectedReceipt.items.map(item => (
                      <div key={item.itemId} className="flex justify-between text-[11px]">
                        <span>{item.quantity}x {language === 'ar' ? item.nameArabic : item.nameEnglish}</span>
                        <span>${(item.quantity * item.sellingPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bill Details */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span>Room Charges:</span>
                  <span>${selectedReceipt.roomCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Item Charges:</span>
                  <span>${selectedReceipt.itemCharges.toFixed(2)}</span>
                </div>
                {selectedReceipt.discountAmount > 0 && (
                  <div className="flex justify-between text-[11px] text-rose-400">
                    <span>Discount:</span>
                    <span>-${selectedReceipt.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-zinc-900 pt-2 text-white">
                  <span>Grand Total:</span>
                  <span className="text-purple-400">${selectedReceipt.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Paid Channel:</span>
                  <span className="uppercase">{selectedReceipt.paymentMethod}</span>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="rounded bg-zinc-900 p-2.5 border border-zinc-850 text-[10px] text-zinc-400">
                  <span className="font-bold text-zinc-300">Notes:</span> {selectedReceipt.notes}
                </div>
              )}
            </div>
          </div>

          {/* Action triggers */}
          <div className="mt-6 pt-4 border-t border-zinc-900 flex gap-2 no-print">
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 text-xs transition-colors cursor-pointer"
            >
              <Printer className="h-4.5 w-4.5" />
              <span>{t('reprint')}</span>
            </button>
          </div>

          {/* Silent Print area injection */}
          <div id="receipt-print-area" className="hidden print-only font-mono text-xs p-4 text-black space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold">{settings.businessName}</h3>
              <p className="text-[10px]">REPRINTED COPY</p>
              <p className="text-[10px]">{new Date(selectedReceipt.timestamp).toLocaleString()}</p>
            </div>

            <div className="border-t border-dashed border-black pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span>{selectedReceipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Room:</span>
                <span>{selectedReceipt.roomName}</span>
              </div>
              {selectedReceipt.customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{selectedReceipt.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{formatDuration(selectedReceipt.duration)}</span>
              </div>
            </div>

            {selectedReceipt.items.length > 0 && (
              <div className="border-t border-dashed border-black pt-2">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-dashed border-black text-[10px]">
                      <th>Item</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReceipt.items.map(item => (
                      <tr key={item.itemId}>
                        <td>{language === 'ar' ? item.nameArabic : item.nameEnglish}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">${(item.quantity * item.sellingPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-dashed border-black pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Room Charges:</span>
                <span>${selectedReceipt.roomCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Item Charges:</span>
                <span>${selectedReceipt.itemCharges.toFixed(2)}</span>
              </div>
              {selectedReceipt.discountAmount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Discount:</span>
                  <span>-${selectedReceipt.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-dashed border-black pt-1">
                <span>Total Due:</span>
                <span>${selectedReceipt.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="uppercase">{selectedReceipt.paymentMethod}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-black pt-4 text-center text-[10px]">
              <p>{settings.receiptFooter}</p>
              <p>Villa 30 PlayStation Lounge POS</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
