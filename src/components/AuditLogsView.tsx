import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { useTranslation } from '../context/TranslationContext';
import { Search, Calendar, User, History, AlertTriangle } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { logs } = usePOS();
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter logs based on role, action, or details
  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    const roleStr = log.employeeRole.toLowerCase();
    const actionStr = log.action.toLowerCase();
    const detailsStr = log.details.toLowerCase();
    const dateStr = new Date(log.timestamp).toLocaleString().toLowerCase();

    return (
      roleStr.includes(query) ||
      actionStr.includes(query) ||
      detailsStr.includes(query) ||
      dateStr.includes(query)
    );
  });

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-white leading-tight">{t('auditLogs')}</h2>
          <p className="text-xs text-zinc-400">Security audit history tracking session actions, settings updates, and pricing modifications.</p>
        </div>
      </div>

      {/* Query Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4.5 w-4.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter audit logs by role, action, details, timestamp..."
          className="w-full rounded-xl bg-zinc-950 pl-10 pr-4 py-2.5 text-xs text-white border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-purple-500 font-semibold"
        />
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-left text-xs font-semibold">
          <thead>
            <tr className="border-b border-zinc-850 bg-zinc-900/40 text-zinc-400 uppercase tracking-wider">
              <th className="p-4">{language === 'ar' ? 'الوقت والتاريخ' : 'Timestamp'}</th>
              <th className="p-4">{language === 'ar' ? 'الصلاحية' : 'Employee Role'}</th>
              <th className="p-4">{language === 'ar' ? 'العملية' : 'Action'}</th>
              <th className="p-4">{language === 'ar' ? 'التفاصيل' : 'Details'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map(log => {
                const isAdmin = log.employeeRole === 'admin';
                return (
                  <tr key={log.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/20 last:border-b-0">
                    
                    {/* Timestamp */}
                    <td className="p-4 text-zinc-400 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    {/* Role */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                        isAdmin 
                          ? 'bg-amber-500/10 text-amber-400' 
                          : 'bg-purple-500/10 text-purple-400'
                      }`}>
                        {isAdmin ? t('roleAdmin') : t('roleCashier')}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-4 font-bold text-white whitespace-nowrap">
                      {log.action}
                    </td>

                    {/* Details */}
                    <td className="p-4 text-zinc-300 leading-normal max-w-xs sm:max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>

                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-zinc-500 text-xs">
                  {t('noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
