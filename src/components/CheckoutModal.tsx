import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { useTranslation } from '../context/TranslationContext';
import { Room, DiscountType, PaymentMethod, Receipt } from '../types';
import { SessionService } from '../services/SessionService';
import { DollarSign, Tag, Check, CreditCard, Wallet, Printer, Receipt as ReceiptIcon, X } from 'lucide-react';

interface CheckoutModalProps {
  room: Room;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ room, onClose }) => {
  const { activeSessions, checkoutSession, settings } = usePOS();
  const { t, language } = useTranslation();
  
  const session = activeSessions[room.id];
  if (!session) return null;

  // Local calculation states
  const [discountVal, setDiscountVal] = useState<number>(session.discountValue || 0);
  const [discountType, setDiscountType] = useState<DiscountType>(session.discountType || 'fixed');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState<string>(session.notes || '');
  
  // Real-time calculation outputs
  const [roomCharges, setRoomCharges] = useState(0);
  const [itemCharges, setItemCharges] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  
  // After-checkout state for printing
  const [finalizedReceipt, setFinalizedReceipt] = useState<Receipt | null>(null);

  // Recalculate billing values
  useEffect(() => {
    // Inject local discount overrides temporarily
    const tempSession = {
      ...session,
      discountValue: discountVal,
      discountType
    };
    const charges = SessionService.calculateCharges(tempSession);
    setRoomCharges(charges.roomCharges);
    setItemCharges(charges.itemCharges);
    setDiscountAmount(charges.discountAmount);
    setGrandTotal(charges.grandTotal);
    setElapsedSec(charges.elapsedSeconds);
  }, [session, discountVal, discountType]);

  const handleCheckout = async () => {
    try {
      const receipt = await checkoutSession(room.id, discountVal, discountType, paymentMethod, notes);
      setFinalizedReceipt(receipt);
    } catch (err) {
      console.error(err);
      alert('Checkout failed!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (language === 'ar') {
      return `${hrs} س ${mins} د ${secs} ث`;
    }
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-zinc-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="h-5 w-5 text-purple-400" />
            <h3 className="text-md font-bold text-white">
              {t('checkout')}: {room.name}
            </h3>
          </div>
          {!finalizedReceipt && (
            <button onClick={onClose} className="text-zinc-400 hover:text-white cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Dynamic checkout layout or success printer */}
        {!finalizedReceipt ? (
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: Summary */}
            <div className="p-6 border-b md:border-b-0 md:border-r border-zinc-800 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('viewDetails')}</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">{t('customerName')}:</span>
                  <span className="text-white font-medium">{session.customerName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">{t('startTime')}:</span>
                  <span className="text-white font-mono">{new Date(session.startTime).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">{t('duration')}:</span>
                  <span className="text-white font-mono">{formatDuration(elapsedSec)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">{t('hourlyRate')}:</span>
                  <span className="text-white font-mono">${session.hourlyRateAtStart.toFixed(2)}/hr</span>
                </div>
              </div>

              {/* Items ordered list */}
              {session.items.length > 0 && (
                <div className="border-t border-zinc-850 pt-3">
                  <h5 className="text-xs font-semibold text-zinc-400 mb-2">{t('items')}</h5>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                    {session.items.map((item) => (
                      <div key={item.itemId} className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-400">
                          {quantityBadge(item.quantity)} {language === 'ar' ? item.nameArabic : item.nameEnglish}
                        </span>
                        <span className="text-white">${(item.quantity * item.sellingPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="border-t border-zinc-850 pt-3">
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-16 w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                  placeholder="..."
                />
              </div>
            </div>

            {/* Right: Payments and Totals */}
            <div className="p-6 bg-zinc-900/20 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Discount input */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-400">{t('discount')}</label>
                  <div className="flex rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 p-1">
                    <input
                      type="number"
                      min="0"
                      value={discountVal || ''}
                      onChange={(e) => setDiscountVal(parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent px-3 py-1 text-sm font-bold text-white focus:outline-none font-mono"
                      placeholder="0.00"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setDiscountType('fixed')}
                        className={`rounded px-2.5 py-1 text-[10px] font-bold cursor-pointer ${
                          discountType === 'fixed'
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        $
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percentage')}
                        className={`rounded px-2.5 py-1 text-[10px] font-bold cursor-pointer ${
                          discountType === 'percentage'
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-400">{t('paymentMethod')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 cursor-pointer ${
                        paymentMethod === 'cash'
                          ? 'border-purple-500 bg-purple-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <DollarSign className="h-5 w-5" />
                      <span className="text-[10px] font-bold">{t('cash')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 cursor-pointer ${
                        paymentMethod === 'card'
                          ? 'border-purple-500 bg-purple-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span className="text-[10px] font-bold">{t('card')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('wallet')}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 cursor-pointer ${
                        paymentMethod === 'wallet'
                          ? 'border-purple-500 bg-purple-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <Wallet className="h-5 w-5" />
                      <span className="text-[10px] font-bold">{t('wallet')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Billing totals panel */}
              <div className="mt-6 border-t border-zinc-800 pt-4 space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>{t('roomCharges')}:</span>
                  <span className="font-mono">${roomCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>{t('itemCharges')}:</span>
                  <span className="font-mono">${itemCharges.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-rose-400">
                    <span>{t('discount')}:</span>
                    <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-800 pt-2 text-md font-extrabold text-white">
                  <span>{t('grandTotal')}:</span>
                  <span className="text-xl text-purple-400 font-mono">${grandTotal.toFixed(2)}</span>
                </div>

                {/* Finalize checkout action */}
                <button
                  onClick={handleCheckout}
                  className="mt-4 w-full rounded-xl bg-purple-600 hover:bg-purple-500 text-white py-3 text-xs font-bold transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
                >
                  {t('checkout')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Checkout finished success panel & print helper */
          <div className="p-6 text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <Check className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">
                {language === 'ar' ? 'تم الدفع بنجاح!' : 'Payment Completed Successfully!'}
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                {language === 'ar' 
                  ? `رقم الفاتورة: ${finalizedReceipt.receiptNumber}` 
                  : `Receipt Reference: ${finalizedReceipt.receiptNumber}`}
              </p>
            </div>

            {/* Print layout selector preview */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 max-w-sm mx-auto text-left space-y-2 no-print font-mono text-xs">
              <div className="text-center font-bold text-white border-b border-zinc-850 pb-2">
                {settings?.businessName || 'Villa 30 Lounge'}
              </div>
              <div className="flex justify-between">
                <span>RECEIPT:</span>
                <span>{finalizedReceipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>ROOM:</span>
                <span>{finalizedReceipt.roomName}</span>
              </div>
              <div className="flex justify-between">
                <span>TOTAL:</span>
                <span className="text-emerald-400 font-bold">${finalizedReceipt.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-center gap-3 no-print pt-4 border-t border-zinc-850">
              <button
                onClick={handlePrint}
                className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>{t('printReceipt')}</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white px-6 py-3 text-xs font-bold cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق ومتابعة' : 'Finish & Close'}
              </button>
            </div>

            {/* Print Only layout template injected in DOM for physical printers */}
            <div id="receipt-print-area" className="hidden print-only font-mono text-xs p-4 text-black space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold">{settings.businessName}</h3>
                <p className="text-[10px]">PlayStation POS System</p>
                <p className="text-[10px]">{new Date(finalizedReceipt.timestamp).toLocaleString()}</p>
              </div>

              <div className="border-t border-dashed border-black pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Receipt #:</span>
                  <span>{finalizedReceipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Room:</span>
                  <span>{finalizedReceipt.roomName}</span>
                </div>
                {finalizedReceipt.customerName && (
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{finalizedReceipt.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{formatDuration(finalizedReceipt.duration)}</span>
                </div>
              </div>

              {/* Items listing */}
              {finalizedReceipt.items.length > 0 && (
                <div className="border-t border-dashed border-black pt-2">
                  <p className="font-bold mb-1">Items</p>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-dashed border-black text-[10px]">
                        <th>Item</th>
                        <th className="text-center">Qty</th>
                        <th className="text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finalizedReceipt.items.map(item => (
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

              {/* Billing Breakdown */}
              <div className="border-t border-dashed border-black pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Room Charges:</span>
                  <span>${finalizedReceipt.roomCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Item Charges:</span>
                  <span>${finalizedReceipt.itemCharges.toFixed(2)}</span>
                </div>
                {finalizedReceipt.discountAmount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Discount:</span>
                    <span>-${finalizedReceipt.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-dashed border-black pt-1">
                  <span>Total Due:</span>
                  <span>${finalizedReceipt.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="uppercase">{finalizedReceipt.paymentMethod}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-dashed border-black pt-4 text-center text-[10px] space-y-1">
                <p>{settings.receiptFooter}</p>
                <p>Villa 30 PlayStation Lounge POS</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Helper badge
const quantityBadge = (qty: number) => (
  <span className="rounded bg-purple-500/10 border border-purple-500/25 px-1 py-0.2 mx-1 text-[10px] text-purple-400 font-bold">
    {qty}x
  </span>
);
