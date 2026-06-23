import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { useTranslation } from '../context/TranslationContext';
import { ReportService, DashboardStats, StatisticsReport } from '../services/ReportService';
import { DollarSign, Gamepad2, TrendingUp, Clock, Download, Printer } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { receipts, rooms, currentShift } = usePOS();
  const { t, language } = useTranslation();

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    activeRoomsCount: 0,
    revenueToday: 0,
    revenueThisWeek: 0,
    revenueThisMonth: 0
  });

  const [statsReport, setStatsReport] = useState<StatisticsReport>({
    sessionCount: 0,
    averageSessionDurationMinutes: 0,
    topSellingItems: [],
    topRevenueRooms: []
  });

  const [paymentBreakdown, setPaymentBreakdown] = useState({ cash: 0, card: 0, wallet: 0 });

  useEffect(() => {
    const loadStats = async () => {
      const dbDashboard = await ReportService.getDashboardStats();
      setDashboardStats(dbDashboard);

      const dbStats = await ReportService.getStatisticsReport();
      setStatsReport(dbStats);

      // Re-calculate payment breakdown for all receipts
      let cash = 0, card = 0, wallet = 0;
      for (const r of receipts) {
        if (r.paymentMethod === 'cash') cash += r.total;
        else if (r.paymentMethod === 'card') card += r.total;
        else if (r.paymentMethod === 'wallet') wallet += r.total;
      }
      setPaymentBreakdown({ cash, card, wallet });
    };
    loadStats();
  }, [receipts, rooms]);

  // Export handlers
  const handleExportCSV = () => {
    const csvContent = ReportService.convertToCSV(receipts);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `villa30_receipts_export_${Date.now()}.csv`);
    link.click();
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(receipts, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `villa30_receipts_export_${Date.now()}.json`);
    link.click();
  };

  const handlePrintDashboard = () => {
    window.print();
  };

  // SVG Chart Computations
  const totalPayment = paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.wallet;
  
  // Dynamic Pie segments (Cash, Card, Wallet)
  const getPiePaths = () => {
    if (totalPayment === 0) return [];
    const values = [paymentBreakdown.cash, paymentBreakdown.card, paymentBreakdown.wallet];
    const colors = ['#a855f7', '#3b82f6', '#10b981']; // Purple, Blue, Green
    
    let accumulatedAngle = 0;
    return values.map((val, idx) => {
      const percentage = val / totalPayment;
      const angle = percentage * 360;
      
      // Calculate coordinates for SVG slice
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + angle;
      accumulatedAngle = endAngle;

      const rad = Math.PI / 180;
      const x1 = 100 + 80 * Math.cos(startAngle * rad);
      const y1 = 100 + 80 * Math.sin(startAngle * rad);
      const x2 = 100 + 80 * Math.cos(endAngle * rad);
      const y2 = 100 + 80 * Math.sin(endAngle * rad);

      const largeArc = angle > 180 ? 1 : 0;
      
      const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
      return { pathData, color: colors[idx], val, label: ['Cash', 'Card', 'Wallet'][idx] };
    });
  };

  const slices = getPiePaths();

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto print:bg-white print:text-black">
      
      {/* View Header */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-extrabold text-white leading-tight">{t('dashboard')}</h2>
          <p className="text-xs text-zinc-400">Real-time revenue metrics, payments, and lounge statistics.</p>
        </div>
        
        {/* Export controls */}
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>JSON</span>
          </button>
          <button
            onClick={handlePrintDashboard}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main KPI Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Active Rooms */}
        <div className="glass-panel rounded-2xl border border-zinc-800 p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{t('activeRooms')}</p>
            <h3 className="text-2xl font-extrabold text-white font-mono">{dashboardStats.activeRoomsCount}</h3>
          </div>
          <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
            <Gamepad2 className="h-6 w-6" />
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="glass-panel rounded-2xl border border-zinc-800 p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{t('revenueToday')}</p>
            <h3 className="text-2xl font-extrabold text-emerald-400 font-mono">${dashboardStats.revenueToday.toFixed(2)}</h3>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Weekly Revenue */}
        <div className="glass-panel rounded-2xl border border-zinc-800 p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{t('revenueThisWeek')}</p>
            <h3 className="text-2xl font-extrabold text-purple-400 font-mono">${dashboardStats.revenueThisWeek.toFixed(2)}</h3>
          </div>
          <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="glass-panel rounded-2xl border border-zinc-800 p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{t('revenueThisMonth')}</p>
            <h3 className="text-2xl font-extrabold text-amber-500 font-mono">${dashboardStats.revenueThisMonth.toFixed(2)}</h3>
          </div>
          <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Graphs and Payment breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Payment Breakdown Card */}
        <div className="glass-panel rounded-2xl border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white mb-4">{language === 'ar' ? 'تصنيف طرق الدفع' : 'Payment Methods Breakdown'}</h4>
            
            {totalPayment > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                {/* SVG Pie Chart */}
                <svg width="200" height="200" className="rotate-[-90deg]">
                  {slices.map((slice, i) => (
                    <path key={i} d={slice.pathData} fill={slice.color} />
                  ))}
                  <circle cx="100" cy="100" r="50" fill="#09090b" />
                </svg>

                {/* Legend */}
                <div className="space-y-2 text-xs font-semibold">
                  {slices.map((slice, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded" style={{ backgroundColor: slice.color }}></span>
                      <span className="text-zinc-400">{t(slice.label.toLowerCase())}:</span>
                      <span className="text-white font-mono">${slice.val.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-500 text-xs">
                {t('noData')}
              </div>
            )}
          </div>
        </div>

        {/* Top revenue Rooms Bar Chart */}
        <div className="glass-panel rounded-2xl border border-zinc-800 p-5 lg:col-span-2">
          <h4 className="text-sm font-bold text-white mb-4">{t('topRevenueRooms')}</h4>
          
          {statsReport.topRevenueRooms.length > 0 ? (
            <div className="space-y-4">
              {statsReport.topRevenueRooms.map((room, idx) => {
                const maxRevenue = Math.max(...statsReport.topRevenueRooms.map(r => r.revenue), 1);
                const percent = (room.revenue / maxRevenue) * 100;
                
                return (
                  <div key={room.roomName} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-300">{room.roomName} ({room.sessionCount} sessions)</span>
                      <span className="text-white font-mono">${room.revenue.toFixed(2)}</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-zinc-500 text-xs">
              {t('noData')}
            </div>
          )}
        </div>
      </div>

      {/* Session stats & Top items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Top Selling Items Table */}
        <div className="glass-panel rounded-2xl border border-zinc-800 p-5">
          <h4 className="text-sm font-bold text-white mb-4">{t('topSellingItems')}</h4>
          {statsReport.topSellingItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-zinc-850 text-zinc-500 uppercase tracking-wider">
                    <th className="pb-2">{language === 'ar' ? 'المنتج' : 'Item'}</th>
                    <th className="pb-2 text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                    <th className="pb-2 text-right">{language === 'ar' ? 'الدخل' : 'Revenue'}</th>
                  </tr>
                </thead>
                <tbody>
                  {statsReport.topSellingItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-zinc-900/60 last:border-b-0">
                      <td className="py-2 text-zinc-300">
                        {language === 'ar' ? item.nameArabic : item.nameEnglish}
                      </td>
                      <td className="py-2 text-center text-zinc-400 font-mono">{item.quantity}</td>
                      <td className="py-2 text-right text-purple-400 font-mono">${item.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-500 text-xs">
              {t('noData')}
            </div>
          )}
        </div>

        {/* Global Statistics Card */}
        <div className="glass-panel rounded-2xl border border-zinc-800 p-5 space-y-4">
          <h4 className="text-sm font-bold text-white">{language === 'ar' ? 'إحصائيات الجلسات العامة' : 'General Session Statistics'}</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-900">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{t('sessionCount')}</span>
              <p className="text-xl font-extrabold text-white mt-1 font-mono">{statsReport.sessionCount}</p>
            </div>
            <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-900">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{t('averageDuration')}</span>
              <p className="text-xl font-extrabold text-white mt-1 font-mono">
                {statsReport.averageSessionDurationMinutes} <span className="text-xs font-semibold text-zinc-500">{t('minutes')}</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-purple-500/5 p-4 border border-purple-500/10 flex items-center gap-3 text-purple-400">
            <Clock className="h-5 w-5 shrink-0" />
            <p className="text-xs leading-relaxed font-semibold">
              {language === 'ar' 
                ? 'يتم حساب أوقات الجلسات تلقائياً وحفظها محلياً للتأكد من دقة البيانات حتى في حال انقطاع الشبكة.'
                : 'Session averages are dynamically updated based on audited physical receipts to guarantee data integrity across shifts.'}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
