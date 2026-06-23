import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { useTranslation } from '../context/TranslationContext';
import { useRole, EmployeeRole } from '../context/RoleContext';
import { Clock, Globe, Shield, RefreshCw, LogOut, Key } from 'lucide-react';
import { ShiftModal } from './ShiftModal';

export const Header: React.FC = () => {
  const { currentShift, settings } = usePOS();
  const { t, language, setLanguage } = useTranslation();
  const { role, setRole } = useRole();
  const [time, setTime] = useState<string>('');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [rolePassword, setRolePassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [roleToSwitch, setRoleToSwitch] = useState<EmployeeRole | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  const handleRoleClick = (newRole: EmployeeRole) => {
    if (newRole === role) return;
    if (newRole === 'admin') {
      setShowPasswordPrompt(true);
      setRoleToSwitch('admin');
      setRolePassword('');
      setErrorMsg('');
    } else {
      setRole('cashier');
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rolePassword === 'admin30') {
      setRole('admin');
      setShowPasswordPrompt(false);
      setRoleToSwitch(null);
    } else {
      setErrorMsg(language === 'ar' ? 'كلمة المرور خاطئة!' : 'Incorrect Password!');
    }
  };

  return (
    <header className="glass-panel sticky top-0 z-40 flex h-16 w-full items-center justify-between px-6 border-b border-zinc-800">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <img src="/logo.svg" alt="Logo" className="h-9 w-9 animate-pulse" />
        <div>
          <h1 className="text-lg font-bold tracking-wider text-white">
            {settings?.businessName || 'Villa 30'}
          </h1>
          <p className="text-[10px] text-zinc-400 font-mono">
            {t('dashboard')} • PWA ACTIVE
          </p>
        </div>
      </div>

      {/* Center Shift Status */}
      <div className="flex items-center gap-3">
        {currentShift?.isOpen ? (
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-semibold text-emerald-400">
              {t('roleCashier')}: {t('Available')}
            </span>
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="ml-2 text-[10px] text-zinc-300 hover:text-white underline"
            >
              {t('closeShift')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/30 px-4 py-1">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span className="text-xs font-semibold text-rose-400">
              {t('roleCashier')}: {language === 'ar' ? 'مغلقة' : 'Closed'}
            </span>
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="ml-2 text-[10px] text-zinc-300 hover:text-white underline font-bold"
            >
              {t('openShift')}
            </button>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-2 text-zinc-300 font-mono text-sm">
          <Clock className="h-4 w-4 text-purple-400" />
          <span>{time}</span>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <Globe className="h-4 w-4 text-blue-400" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>

        {/* Role Switcher */}
        <div className="flex items-center gap-1.5 rounded-lg bg-zinc-900 p-1 border border-zinc-800">
          <button
            onClick={() => handleRoleClick('cashier')}
            className={`rounded px-2.5 py-1 text-[11px] font-bold transition-all ${
              role === 'cashier'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t('roleCashier')}
          </button>
          <button
            onClick={() => handleRoleClick('admin')}
            className={`rounded px-2.5 py-1 text-[11px] font-bold transition-all ${
              role === 'admin'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t('roleAdmin')}
          </button>
        </div>
      </div>

      {/* Shift reconciliation modal */}
      {isShiftModalOpen && (
        <ShiftModal onClose={() => setIsShiftModalOpen(false)} />
      )}

      {/* Admin Password Prompt */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handlePasswordSubmit}
            className="glass-panel w-96 rounded-xl p-6 border border-zinc-700 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-md font-bold text-white">
                  {language === 'ar' ? 'التحقق من هوية المدير' : 'Admin Credentials'}
                </h3>
                <p className="text-sm font-bold text-amber-500 mt-1">
                  {language === 'ar' ? 'كلمة المرور الافتراضية: admin30' : 'Default Password: admin30'}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <input
                type="password"
                required
                value={rolePassword}
                onChange={(e) => setRolePassword(e.target.value)}
                placeholder="••••••"
                className="w-full rounded-lg bg-zinc-950 px-4 py-2 text-center text-lg tracking-widest text-white border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
              {errorMsg && <p className="mt-2 text-xs text-red-500">{errorMsg}</p>}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setRoleToSwitch(null);
                }}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 text-xs font-semibold transition-colors"
              >
                {language === 'ar' ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};
