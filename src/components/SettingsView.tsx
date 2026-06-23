import React, { useState, useRef } from 'react';
import { usePOS } from '../context/POSContext';
import { useTranslation } from '../context/TranslationContext';
import { useRole } from '../context/RoleContext';
import { SystemSettings } from '../types';
import { 
  Save, Database, Landmark, Palette, RefreshCw, 
  Trash2, Upload, Download, Sparkles, Check, 
  X, AlertTriangle, ShieldCheck 
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    settings, saveSettings, bulkApplyRate, backups, 
    createManualBackup, restoreBackup, deleteBackup, importBackupFile 
  } = usePOS();
  
  const { t, language } = useTranslation();
  const { role } = useRole();

  // Local Form state
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [currency, setCurrency] = useState(settings.currency);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [printWidth, setPrintWidth] = useState<'58mm' | '80mm'>(settings.printWidth);

  // Status Colors state
  const [statusColors, setStatusColors] = useState({ ...settings.statusColors });

  // Bulk rate apply state
  const [bulkRateVal, setBulkRateVal] = useState<number>(10);

  // Alert Success triggers
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');

  // File import reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemSettings = {
      ...settings,
      businessName,
      currency,
      receiptFooter,
      printWidth,
      statusColors
    };
    await saveSettings(updated);
    setSaveSuccessMsg(t('saveSuccess'));
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleBulkRateApply = async (e: React.FormEvent) => {
    e.preventDefault();
    await bulkApplyRate(bulkRateVal);
    setBulkSuccessMsg(t('rateAppliedSuccess'));
    setTimeout(() => setBulkSuccessMsg(''), 3000);
  };

  const triggerCreateBackup = async () => {
    await createManualBackup();
    setBackupSuccessMsg(t('backupSuccess'));
    setTimeout(() => setBackupSuccessMsg(''), 3000);
  };

  const triggerExportBackupFile = (backupDataStr: string, id: string) => {
    const blob = new Blob([backupDataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `villa30_backup_${id}_${Date.now()}.json`;
    link.click();
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        await importBackupFile(text);
        setBackupSuccessMsg(t('restoreSuccess'));
        setTimeout(() => setBackupSuccessMsg(''), 3000);
      } catch (err) {
        alert('Failed to parse backup file: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      
      {/* View Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white leading-tight">{t('settings')}</h2>
        <p className="text-xs text-zinc-400">Configure business rules, status colors, thermal printing options, and database recovery.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: General Preference Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSavePreferences} className="glass-panel rounded-2xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                <Landmark className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">{t('editSettings')}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('businessName')}</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 px-3.5 py-2 text-xs text-white border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{language === 'ar' ? 'العملة المعروضة' : 'Currency Symbol'}</label>
                <input
                  type="text"
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 px-3.5 py-2 text-xs text-white border border-zinc-850 font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('receiptFooter')}</label>
                <input
                  type="text"
                  required
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 px-3.5 py-2 text-xs text-white border border-zinc-850 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-zinc-400">{t('thermalWidth')}</label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setPrintWidth('58mm')}
                    className={`rounded py-1.5 text-xs font-bold cursor-pointer ${printWidth === '58mm' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                  >
                    58mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintWidth('80mm')}
                    className={`rounded py-1.5 text-xs font-bold cursor-pointer ${printWidth === '80mm' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                  >
                    80mm
                  </button>
                </div>
              </div>
            </div>

            {/* Status Colors settings */}
            <div className="border-t border-zinc-900 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Palette className="h-4 w-4 text-purple-400" />
                <span>{t('statusColorsTitle')}</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(statusColors).map(([status, color]) => (
                  <div key={status} className="rounded-xl bg-zinc-950 p-3 border border-zinc-900 flex flex-col gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{t(status)}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setStatusColors({ ...statusColors, [status]: e.target.value })}
                        className="h-7 w-7 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <span className="text-[10px] font-mono text-zinc-400">{color}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save preferences action */}
            <div className="flex justify-between items-center border-t border-zinc-900 pt-4">
              <span className="text-emerald-400 text-xs font-semibold">{saveSuccessMsg}</span>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 text-xs font-bold transition-all cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{t('save')}</span>
              </button>
            </div>
          </form>

          {/* Room Pricing Bulk Application Card */}
          <form onSubmit={handleBulkRateApply} className="glass-panel rounded-2xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">{t('bulkApplyRate')}</h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('hourlyRate')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={bulkRateVal || ''}
                    onChange={(e) => setBulkRateVal(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg bg-zinc-950 px-8 py-2 text-xs font-bold text-white border border-zinc-850 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 text-xs font-bold cursor-pointer transition-colors"
              >
                {language === 'ar' ? 'تطبيق على الكل' : 'Apply to All'}
              </button>
            </div>
            {bulkSuccessMsg && <p className="text-xs text-emerald-400 font-semibold">{bulkSuccessMsg}</p>}
          </form>
        </div>

        {/* Right: Database Backup Recovery Utilities */}
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-white">{t('backup')}</h3>
            </div>

            {/* Manual backup trigger & importer */}
            <div className="space-y-2.5">
              <button
                onClick={triggerCreateBackup}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold py-2.5 text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Database className="h-4 w-4 text-purple-400" />
                <span>{t('manualBackup')}</span>
              </button>

              {/* Secret File Importer */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFileChange}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold py-2.5 text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="h-4 w-4 text-blue-400" />
                <span>{t('import')}</span>
              </button>
            </div>

            {backupSuccessMsg && <p className="text-xs text-emerald-400 font-semibold">{backupSuccessMsg}</p>}

            <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-900 space-y-2">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">{t('autoBackup')}</span>
              <div className="flex items-center gap-2 text-zinc-300 text-xs font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span>{t('autoBackupLabel')}</span>
              </div>
            </div>

            {/* Backups List */}
            <div className="border-t border-zinc-900 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-white">{t('backupsList')}</h4>
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {backups.length > 0 ? (
                  backups.map(bk => (
                    <div key={bk.id} className="rounded-lg bg-zinc-950 p-2.5 border border-zinc-900 flex justify-between items-center text-[10px] font-mono">
                      <div className="space-y-0.5">
                        <span className="font-bold text-white">{bk.id.substring(0, 15)}...</span>
                        <span className="text-zinc-500 block">{new Date(bk.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => triggerExportBackupFile(bk.data, bk.id)}
                          className="p-1 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded cursor-pointer"
                          title={t('export')}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(t('restoreSuccess') + '?')) {
                              await restoreBackup(bk.id);
                              alert(t('restoreSuccess'));
                            }
                          }}
                          className="p-1 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded cursor-pointer"
                          title={t('restore')}
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
                        </button>
                        <button
                          onClick={() => deleteBackup(bk.id)}
                          className="p-1 hover:bg-zinc-900 text-zinc-500 hover:text-rose-500 rounded cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-zinc-600 text-xs py-4">No backups saved</div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
