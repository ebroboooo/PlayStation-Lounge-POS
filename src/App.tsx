import React, { useState, useEffect } from 'react';
import { usePOS, POSProvider } from './context/POSContext';
import { useTranslation } from './context/TranslationContext';
import { useRole } from './context/RoleContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RoomsView } from './components/RoomsView';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { ReceiptsView } from './components/ReceiptsView';
import { AuditLogsView } from './components/AuditLogsView';
import { SettingsView } from './components/SettingsView';
import { RefreshCw, Play, ShieldAlert } from 'lucide-react';

const AppContent: React.FC = () => {
  const { loading, rooms } = usePOS();
  const { t, language } = useTranslation();
  const { role, canAccessAuditLogs, canChangeSettings } = useRole();
  const [activeTab, setActiveTab] = useState<string>('rooms');

  // Enforce role-based access security on active view
  useEffect(() => {
    if (activeTab === 'auditLogs' && !canAccessAuditLogs) {
      setActiveTab('rooms');
    }
    if (activeTab === 'settings' && !canChangeSettings) {
      setActiveTab('rooms');
    }
  }, [role, activeTab, canAccessAuditLogs, canChangeSettings]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-white gap-4">
        <RefreshCw className="h-10 w-10 text-purple-500 animate-spin" />
        <div className="text-center space-y-1">
          <h2 className="text-md font-bold">VILLA 30</h2>
          <p className="text-xs text-zinc-500 font-mono">Initializing IndexedDB & Seeding defaults...</p>
        </div>
      </div>
    );
  }

  // Render view corresponding to selected navigation tab
  const renderView = () => {
    switch (activeTab) {
      case 'rooms':
        return <RoomsView />;
      case 'dashboard':
        return <DashboardView />;
      case 'inventory':
        return <InventoryView />;
      case 'receipts':
        return <ReceiptsView />;
      case 'auditLogs':
        return canAccessAuditLogs ? <AuditLogsView /> : <RoomsView />;
      case 'settings':
        return canChangeSettings ? <SettingsView /> : <RoomsView />;
      default:
        return <RoomsView />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col antialiased">
      {/* Top Navigation Header */}
      <Header />

      {/* Workspace Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <POSProvider>
      <AppContent />
    </POSProvider>
  );
}

export default App;
