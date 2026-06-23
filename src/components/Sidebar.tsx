import React from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useRole } from '../context/RoleContext';
import { LayoutGrid, Gamepad2, Package, Receipt, History, Settings, User } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useTranslation();
  const { role, canAccessAuditLogs, canChangeSettings } = useRole();

  const menuItems = [
    { id: 'rooms', label: t('rooms'), icon: Gamepad2, show: true },
    { id: 'dashboard', label: t('dashboard'), icon: LayoutGrid, show: true },
    { id: 'inventory', label: t('inventory'), icon: Package, show: true },
    { id: 'receipts', label: t('receipts'), icon: Receipt, show: true },
    { id: 'auditLogs', label: t('auditLogs'), icon: History, show: canAccessAuditLogs },
    { id: 'settings', label: t('settings'), icon: Settings, show: canChangeSettings },
  ];

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col justify-between p-4 h-[calc(100vh-4rem)] sticky top-16">
      {/* Menu List */}
      <nav className="flex flex-col gap-2">
        {menuItems
          .filter(item => item.show)
          .map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-250 cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-purple-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
      </nav>

      {/* Logged User Info */}
      <div className="rounded-xl bg-zinc-900/60 p-4 border border-zinc-800 flex items-center gap-3">
        <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
          <User className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            {t('switchRole')}
          </p>
          <h4 className="text-xs font-bold text-white">
            {role === 'admin' ? t('roleAdmin') : t('roleCashier')}
          </h4>
        </div>
      </div>
    </aside>
  );
};
