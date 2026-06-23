import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { useTranslation } from '../context/TranslationContext';
import { useRole } from '../context/RoleContext';
import { Room, RoomCategory, RoomStatus, Session } from '../types';
import { SessionService } from '../services/SessionService';
import { CheckoutModal } from './CheckoutModal';
import { 
  Gamepad2, Monitor, Crown, Sofa, Tv, 
  Play, Pause, Plus, ShieldAlert, Sparkles, 
  Clock, Package, PlusCircle, CheckCircle, 
  Settings, ChevronRight, X, AlertCircle, Search 
} from 'lucide-react';

export const RoomsView: React.FC = () => {
  const { 
    rooms, inventory, activeSessions, currentShift,
    startSession, pauseSession, resumeSession, addMinutes, 
    addSessionItem, removeSessionItem, updateRoomConfig 
  } = usePOS();
  const { t, language } = useTranslation();
  const { role, canChangePricing } = useRole();

  // Unified dynamic clock for synchronized timer renders
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Modal triggers
  const [selectedRoomForStart, setSelectedRoomForStart] = useState<Room | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [sessionType, setSessionType] = useState<'open' | 'limit'>('open');
  const [limitMinutesVal, setLimitMinutesVal] = useState<number>(60);
  
  const [selectedRoomForCheckout, setSelectedRoomForCheckout] = useState<Room | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [addItemRoomId, setAddItemRoomId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick add favorites resolver
  const favoriteItems = inventory
    .filter(item => item.favoriteItem && item.stockQuantity > 0)
    .slice(0, 4);

  const handleStartSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForStart) return;
    
    await startSession(
      selectedRoomForStart.id, 
      customerName, 
      sessionType === 'limit' ? limitMinutesVal : undefined
    );
    
    // Clear forms
    setSelectedRoomForStart(null);
    setCustomerName('');
    setSessionType('open');
    setLimitMinutesVal(60);
  };

  const getRoomIcon = (iconName: string) => {
    switch (iconName) {
      case 'Gamepad': return Gamepad2;
      case 'Monitor': return Monitor;
      case 'Crown': return Crown;
      case 'Sofa': return Sofa;
      case 'Tv': return Tv;
      default: return Gamepad2;
    }
  };

  const formatElapsedTime = (session: Session, currentTime: number) => {
    const charges = SessionService.calculateCharges(session, currentTime);
    const totalSec = charges.elapsedSeconds;
    
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    
    // Format: 00:00:00
    const pad = (num: number) => String(num).padStart(2, '0');
    
    let timeString = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    
    if (session.limitMinutes && session.limitMinutes > 0) {
      const limitSec = session.limitMinutes * 60;
      const progress = Math.min(100, (totalSec / limitSec) * 100);
      const isOver = totalSec >= limitSec;
      return { timeString, progress, isOver };
    }
    
    return { timeString, progress: 0, isOver: false };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 h-full overflow-y-auto">
      
      {/* Main Grid Section */}
      <div className="flex-1">
        
        {/* Active Shift Guard Banner */}
        {!currentShift?.isOpen && (
          <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center gap-3 text-amber-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">{t('warning') || 'Warning'}: </span>
              {language === 'ar' 
                ? 'الرجاء فتح وردية جديدة من شريط التنقل العلوي قبل بدء جلسات اللعب!' 
                : 'Please open a new shift from the top bar before initiating gameplay sessions!'}
            </div>
          </div>
        )}

        {/* Room Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {rooms.map(room => {
            const IconComponent = getRoomIcon(room.icon);
            const session = activeSessions[room.id];
            const isMaintenance = room.status === 'Maintenance';
            const isActive = room.status === 'Active';
            const isPaused = room.status === 'Paused';

            // Resolve status-specific glow borders
            let statusBorderColor = 'border-zinc-800';
            if (isMaintenance) statusBorderColor = 'border-yellow-500/50 shadow-lg shadow-yellow-500/5';
            else if (isActive) statusBorderColor = 'border-blue-500/50 shadow-lg shadow-blue-500/5';
            else if (isPaused) statusBorderColor = 'border-orange-500/50 shadow-lg shadow-orange-500/5';
            else if (room.status === 'Available') statusBorderColor = 'border-emerald-500/30';

            // Resolve dynamic timer details
            const elapsed = session ? formatElapsedTime(session, now) : null;
            const charges = session ? SessionService.calculateCharges(session, now) : null;

            return (
              <div 
                key={room.id}
                className={`glass-panel rounded-2xl border p-5 flex flex-col justify-between transition-all duration-250 hover:border-zinc-700 ${statusBorderColor}`}
              >
                
                {/* Top Card Panel */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="rounded-xl p-2.5 text-white shadow-inner"
                        style={{ backgroundColor: room.color || '#3f3f46' }}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight">{room.name}</h4>
                        <span className="text-[10px] text-zinc-400 font-medium tracking-wider">
                          {t(room.category)} • ${room.hourlyRate}/hr
                        </span>
                      </div>
                    </div>

                    {/* Room status badge */}
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                      isMaintenance ? 'bg-yellow-500/10 text-yellow-400' :
                      isActive ? 'bg-blue-500/10 text-blue-400' :
                      isPaused ? 'bg-orange-500/10 text-orange-400' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {t(room.status)}
                    </span>
                  </div>

                  {/* Timer & Progress for Active/Paused Sessions */}
                  {session && elapsed && charges && (
                    <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-900 mb-4 space-y-3 font-mono">
                      
                      {/* Timer Display */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{session.customerName || t('optional')}</span>
                        </div>
                        <span className={`text-md font-extrabold ${elapsed.isOver ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
                          {elapsed.timeString}
                        </span>
                      </div>

                      {/* Limit Progress bar */}
                      {session.limitMinutes && (
                        <div className="space-y-1">
                          <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${elapsed.isOver ? 'bg-rose-500' : 'bg-purple-600'}`}
                              style={{ width: `${elapsed.progress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[9px] text-zinc-500">
                            <span>Limit: {session.limitMinutes} min</span>
                            <span>{Math.round(elapsed.progress)}%</span>
                          </div>
                        </div>
                      )}

                      {/* Live Charges Row */}
                      <div className="flex justify-between text-xs pt-1 border-t border-zinc-900">
                        <span className="text-zinc-400">{t('grandTotal')}:</span>
                        <span className="text-purple-400 font-extrabold">${charges.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Maintenance mode indicator */}
                  {isMaintenance && (
                    <div className="rounded-xl bg-yellow-500/5 p-4 border border-yellow-500/10 mb-4 flex items-center gap-2.5 text-yellow-500/90">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-semibold">
                        {language === 'ar' ? 'الغرفة قيد الصيانة الطارئة' : 'Room Locked for Maintenance'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions & Favorite Items */}
                <div className="space-y-4">
                  
                  {/* Quick Add Button Row */}
                  {isActive && (
                    <div className="border-t border-zinc-850 pt-3">
                      <button
                        onClick={() => setAddItemRoomId(room.id)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 font-semibold p-2 border border-zinc-850 cursor-pointer"
                      >
                        <PlusCircle className="h-4 w-4" />
                        {t('addItem')}
                      </button>
                    </div>
                  )}

                  {/* Room status action panel */}
                  <div className="flex items-center gap-2">
                    
                    {/* START SESSION */}
                    {room.status === 'Available' && (
                      <button
                        onClick={() => currentShift?.isOpen && setSelectedRoomForStart(room)}
                        disabled={!currentShift?.isOpen}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="h-4 w-4" />
                        <span>{t('startSession')}</span>
                      </button>
                    )}

                    {/* ACTIVE ACTIONS */}
                    {isActive && (
                      <div className="w-full space-y-2">
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            onClick={() => addMinutes(room.id, 15)}
                            className="rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-[10px] text-zinc-300 font-bold py-1.5 cursor-pointer"
                          >
                            +15m
                          </button>
                          <button
                            onClick={() => addMinutes(room.id, 30)}
                            className="rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-[10px] text-zinc-300 font-bold py-1.5 cursor-pointer"
                          >
                            +30m
                          </button>
                          <button
                            onClick={() => addMinutes(room.id, 60)}
                            className="rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-[10px] text-zinc-300 font-bold py-1.5 cursor-pointer"
                          >
                            +60m
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => pauseSession(room.id)}
                            className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-orange-600/10 border border-orange-500/20 hover:bg-orange-600/20 text-orange-400 font-bold py-2 text-xs transition-all cursor-pointer"
                          >
                            <Pause className="h-3.5 w-3.5" />
                            <span>{t('pauseSession')}</span>
                          </button>
                          <button
                            onClick={() => setSelectedRoomForCheckout(room)}
                            className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 text-xs transition-all cursor-pointer"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>{t('endSession')}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PAUSED ACTIONS */}
                    {isPaused && (
                      <div className="w-full flex gap-2">
                        <button
                          onClick={() => resumeSession(room.id)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 text-xs transition-all cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>{t('resumeSession')}</span>
                        </button>
                        <button
                          onClick={() => setSelectedRoomForCheckout(room)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 text-xs transition-all cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>{t('endSession')}</span>
                        </button>
                      </div>
                    )}

                    {/* MAINTENANCE ACTIONS */}
                    {isMaintenance && (
                      <button
                        onClick={async () => {
                          const updated = { ...room, status: 'Available' as RoomStatus };
                          await updateRoomConfig(updated);
                        }}
                        className="w-full rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold py-2.5 text-xs transition-colors cursor-pointer"
                      >
                        {t('unlockMaintenance')}
                      </button>
                    )}

                    {/* Room settings panel trigger */}
                    <button
                      onClick={() => setEditingRoom(room)}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white p-2.5 transition-colors cursor-pointer"
                      title={t('renameRoom')}
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Start Session Input Form Dialog */}
      {selectedRoomForStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <form 
            onSubmit={handleStartSessionSubmit}
            className="glass-panel w-96 rounded-2xl border border-zinc-700 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
              <h3 className="text-md font-bold text-white">{t('startSession')}: {selectedRoomForStart.name}</h3>
              <button type="button" onClick={() => setSelectedRoomForStart(null)} className="text-zinc-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Customer input */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('customerName')} ({t('optional')})</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Joe Doe"
                className="w-full rounded-lg bg-zinc-950 px-3.5 py-2 text-sm text-white border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Type selector */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-zinc-400">{t('sessionType')}</label>
              <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-850">
                <button
                  type="button"
                  onClick={() => setSessionType('open')}
                  className={`rounded py-1.5 text-xs font-semibold cursor-pointer ${sessionType === 'open' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                >
                  {t('openTime')}
                </button>
                <button
                  type="button"
                  onClick={() => setSessionType('limit')}
                  className={`rounded py-1.5 text-xs font-semibold cursor-pointer ${sessionType === 'limit' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                >
                  {t('limitedTime')}
                </button>
              </div>
            </div>

            {/* Time selection input for limit session */}
            {sessionType === 'limit' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('limitInMinutes')}</label>
                <input
                  type="number"
                  min="5"
                  value={limitMinutesVal}
                  onChange={(e) => setLimitMinutesVal(parseInt(e.target.value) || 1)}
                  className="w-full rounded-lg bg-zinc-950 px-3.5 py-2 text-sm text-white border border-zinc-850 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <div className="grid grid-cols-4 gap-1 mt-1.5">
                  {[30, 60, 120, 180].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setLimitMinutesVal(mins)}
                      className="rounded bg-zinc-900 hover:bg-zinc-850 text-[10px] text-zinc-400 py-1 border border-zinc-850 cursor-pointer"
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => setSelectedRoomForStart(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                {t('startSession')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Room detail Configuration side panel Drawer */}
      {editingRoom && (
        <div className="fixed inset-y-0 right-0 z-50 w-96 bg-zinc-950 border-l border-zinc-800 shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-250">
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
              <h3 className="text-md font-bold text-white">{t('renameRoom')}: {editingRoom.name}</h3>
              <button onClick={() => setEditingRoom(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('roomName')}</label>
                <input
                  type="text"
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full rounded-lg bg-zinc-900 px-3.5 py-2 text-sm text-white border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Hourly Rate */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('hourlyRate')}</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!canChangePricing}
                  value={editingRoom.hourlyRate}
                  onChange={(e) => setEditingRoom({ ...editingRoom, hourlyRate: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg bg-zinc-900 px-3.5 py-2 text-sm text-white border border-zinc-850 disabled:opacity-50 font-mono focus:outline-none"
                />
                {!canChangePricing && <p className="text-[10px] text-amber-500 mt-1">{t('permissionError')}</p>}
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">{t('roomCategory')}</label>
                <select
                  value={editingRoom.category}
                  onChange={(e) => setEditingRoom({ ...editingRoom, category: e.target.value as RoomCategory })}
                  className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white border border-zinc-850 focus:outline-none"
                >
                  <option value="PS5">PS5</option>
                  <option value="PS4">PS4</option>
                  <option value="VIP">VIP</option>
                  <option value="Standard">Standard</option>
                </select>
              </div>

              {/* Colors selector */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">{t('roomColor')}</label>
                <div className="flex gap-2">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingRoom({ ...editingRoom, color })}
                      className={`h-7 w-7 rounded-full border border-black cursor-pointer ${editingRoom.color === color ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                    ></button>
                  ))}
                </div>
              </div>

              {/* Icons selector */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">{t('roomIcon')}</label>
                <div className="grid grid-cols-5 gap-2">
                  {['Gamepad', 'Monitor', 'Crown', 'Sofa', 'Tv'].map(iconName => {
                    const TargetIcon = getRoomIcon(iconName);
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setEditingRoom({ ...editingRoom, icon: iconName })}
                        className={`rounded-lg p-2.5 bg-zinc-900 border text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer ${
                          editingRoom.icon === iconName ? 'border-purple-500 text-white bg-purple-500/10' : 'border-zinc-850'
                        }`}
                      >
                        <TargetIcon className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lock into Maintenance */}
              <div className="pt-4 border-t border-zinc-900 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-white">{t('lockMaintenance')}</h4>
                  <p className="text-[10px] text-zinc-500">Lock console from gameplay sessions</p>
                </div>
                <input
                  type="checkbox"
                  checked={editingRoom.status === 'Maintenance'}
                  onChange={async (e) => {
                    const status = e.target.checked ? 'Maintenance' as RoomStatus : 'Available' as RoomStatus;
                    setEditingRoom({ ...editingRoom, status });
                  }}
                  className="h-4 w-4 text-purple-600 rounded bg-zinc-900 border-zinc-800"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-900 pt-4">
            <button
              onClick={() => setEditingRoom(null)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              onClick={async () => {
                await updateRoomConfig(editingRoom);
                setEditingRoom(null);
              }}
              className="rounded-lg bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-xs font-bold cursor-pointer"
            >
              {t('save')}
            </button>
          </div>
        </div>
      )}

      {/* End Session Checkout Dialog Trigger */}
      {selectedRoomForCheckout && (
        <CheckoutModal 
          room={selectedRoomForCheckout} 
          onClose={() => setSelectedRoomForCheckout(null)} 
        />
      )}

      {/* Add Item Modal */}
      {addItemRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-zinc-700 shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-zinc-850 flex justify-between items-center bg-zinc-900/50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-400" />
                {t('addItem')}
              </h3>
              <button onClick={() => { setAddItemRoomId(null); setSearchQuery(''); }} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-zinc-850">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'بحث عن منتج...' : 'Search for an item...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {['Snacks', 'Bar', 'Hot Drinks', 'Cold Drinks'].map((category) => {
                const categoryItems = inventory.filter(item => 
                  item.category === category && 
                  (item.nameEnglish.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   item.nameArabic.includes(searchQuery))
                );

                if (categoryItems.length === 0) return null;

                return (
                  <div key={category}>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 ml-1">{t(category) || category}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {categoryItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            addSessionItem(addItemRoomId, item.id, 1);
                            setAddItemRoomId(null);
                            setSearchQuery('');
                          }}
                          disabled={item.stockQuantity <= 0}
                          className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-purple-500/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          <span className="font-semibold text-zinc-200 text-sm mb-1 text-center group-hover:text-white line-clamp-1">
                            {language === 'ar' ? item.nameArabic : item.nameEnglish}
                          </span>
                          <span className="text-purple-400 font-bold text-xs">${item.sellingPrice.toFixed(2)}</span>
                          {item.stockQuantity <= 0 && (
                            <span className="text-[9px] text-red-500 font-bold mt-1 uppercase">Out of Stock</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
