import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room, Session, InventoryItem, Receipt, AuditLog, SystemSettings, Backup, DiscountType, PaymentMethod, ShiftReport } from '../types';
import { IndexedDBManager } from '../db/db';
import { RoomRepository } from '../repositories/RoomRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { InventoryRepository } from '../repositories/InventoryRepository';
import { ReceiptRepository } from '../repositories/ReceiptRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { SettingRepository } from '../repositories/SettingRepository';
import { SessionService } from '../services/SessionService';
import { BackupService } from '../services/BackupService';
import { ReportService } from '../services/ReportService';
import { useRole } from './RoleContext';

interface ShiftState {
  isOpen: boolean;
  openingCash: number;
  openTime: number;
}

interface POSContextType {
  rooms: Room[];
  inventory: InventoryItem[];
  receipts: Receipt[];
  logs: AuditLog[];
  backups: Backup[];
  settings: SystemSettings;
  activeSessions: { [roomId: string]: Session };
  currentShift: ShiftState | null;
  loading: boolean;
  
  // Shift Operations
  openShift: (openingCash: number) => Promise<void>;
  closeShift: (actualCash: number) => Promise<ShiftReport>;
  
  // Room Actions
  startSession: (roomId: string, customerName?: string, limitMinutes?: number) => Promise<void>;
  pauseSession: (roomId: string) => Promise<void>;
  resumeSession: (roomId: string) => Promise<void>;
  addMinutes: (roomId: string, minutes: number) => Promise<void>;
  addSessionItem: (roomId: string, itemId: string, quantity: number) => Promise<void>;
  removeSessionItem: (roomId: string, itemId: string, quantity: number) => Promise<void>;
  updateSessionNotes: (roomId: string, notes: string) => Promise<void>;
  updateSessionDiscounts: (roomId: string, discountValue: number, discountType: DiscountType) => Promise<void>;
  checkoutSession: (
    roomId: string,
    discountValue: number,
    discountType: DiscountType,
    paymentMethod: PaymentMethod,
    notes?: string
  ) => Promise<Receipt>;
  
  // Configuration
  updateRoomConfig: (room: Room) => Promise<void>;
  bulkApplyRate: (rate: number) => Promise<void>;
  saveSettings: (settings: SystemSettings) => Promise<void>;
  
  // Inventory Operations
  saveInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  
  // Backup Operations
  createManualBackup: () => Promise<void>;
  restoreBackup: (backupId: string) => Promise<void>;
  importBackupFile: (jsonString: string) => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useRole();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    businessName: 'Villa 30 PlayStation Lounge',
    currency: 'USD',
    receiptFooter: 'Thank you for playing at Villa 30! Visit us again soon.',
    language: 'en',
    theme: 'dark',
    printWidth: '80mm',
    statusColors: { Available: '#22c55e', Active: '#3b82f6', Paused: '#f59e0b', Maintenance: '#eab308' }
  });
  const [activeSessions, setActiveSessions] = useState<{ [roomId: string]: Session }>({});
  const [currentShift, setCurrentShift] = useState<ShiftState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize DB and load data
  useEffect(() => {
    const initialize = async () => {
      try {
        await IndexedDBManager.getDB();
        await IndexedDBManager.initializeSeedData();
        
        // Load settings, rooms, inventory, receipts, logs, backups
        const dbSettings = await SettingRepository.getSettings();
        setSettings(dbSettings);

        const dbRooms = await RoomRepository.getAll();
        setRooms(dbRooms);

        const dbInventory = await InventoryRepository.getAll();
        setInventory(dbInventory);

        const dbReceipts = await ReceiptRepository.getAll();
        setReceipts(dbReceipts);

        const dbLogs = await AuditLogRepository.getAll();
        setLogs(dbLogs);

        const dbBackups = await BackupService.getAllBackups();
        setBackups(dbBackups);

        // Resolve active sessions from DB
        const dbSessions = await SessionRepository.getAll();
        const active: { [roomId: string]: Session } = {};
        for (const session of dbSessions) {
          if (session.status !== 'completed') {
            active[session.roomId] = session;
          }
        }
        setActiveSessions(active);

        // Load shift status from localStorage
        const savedShift = localStorage.getItem('v30_pos_shift');
        if (savedShift) {
          setCurrentShift(JSON.parse(savedShift));
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize database', err);
        setLoading(false);
      }
    };
    initialize();
  }, []);

  // Set up 30-minute automatic backup cron
  useEffect(() => {
    const interval = setInterval(async () => {
      if (currentShift?.isOpen) {
        try {
          await BackupService.createBackup('auto');
          const dbBackups = await BackupService.getAllBackups();
          setBackups(dbBackups);
          console.log('Automated periodic backup completed.');
        } catch (err) {
          console.error('Automated backup failed', err);
        }
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [currentShift]);

  // Refresh methods
  const refreshRooms = async () => setRooms(await RoomRepository.getAll());
  const refreshInventory = async () => setInventory(await InventoryRepository.getAll());
  const refreshReceipts = async () => setReceipts(await ReceiptRepository.getAll());
  const refreshLogs = async () => setLogs(await AuditLogRepository.getAll());
  const refreshBackups = async () => setBackups(await BackupService.getAllBackups());

  // Shift Operations
  const openShift = async (openingCash: number) => {
    const newShift: ShiftState = {
      isOpen: true,
      openingCash,
      openTime: Date.now()
    };
    setCurrentShift(newShift);
    localStorage.setItem('v30_pos_shift', JSON.stringify(newShift));
    await AuditLogRepository.log(role, 'Open Shift', `Opened new shift with $${openingCash} opening cash.`);
    await refreshLogs();
  };

  const closeShift = async (actualCash: number): Promise<ShiftReport> => {
    if (!currentShift) throw new Error('No active shift');
    
    const report = await ReportService.getCurrentShiftReport(currentShift.openingCash, actualCash);
    
    // Log audit
    await AuditLogRepository.log(
      role,
      'Close Shift',
      `Closed shift. Expected Cash: $${report.expectedCash}, Actual Cash: $${report.actualCash}, Diff: $${report.difference}`
    );

    // Reset shift
    setCurrentShift(null);
    localStorage.removeItem('v30_pos_shift');
    await refreshLogs();
    
    return report;
  };

  // Session Operations
  const startSession = async (roomId: string, customerName?: string, limitMinutes?: number) => {
    const session = await SessionService.startSession(roomId, customerName, limitMinutes, role);
    setActiveSessions(prev => ({ ...prev, [roomId]: session }));
    await refreshRooms();
    await refreshLogs();
  };

  const pauseSession = async (roomId: string) => {
    const session = activeSessions[roomId];
    if (!session) return;
    const updated = await SessionService.pauseSession(session.id, role);
    setActiveSessions(prev => ({ ...prev, [roomId]: updated }));
    await refreshRooms();
    await refreshLogs();
  };

  const resumeSession = async (roomId: string) => {
    const session = activeSessions[roomId];
    if (!session) return;
    const updated = await SessionService.resumeSession(session.id, role);
    setActiveSessions(prev => ({ ...prev, [roomId]: updated }));
    await refreshRooms();
    await refreshLogs();
  };

  const addMinutes = async (roomId: string, minutes: number) => {
    const session = activeSessions[roomId];
    if (!session) return;
    const updated = await SessionService.addMinutes(session.id, minutes, role);
    setActiveSessions(prev => ({ ...prev, [roomId]: updated }));
    await refreshLogs();
  };

  const addSessionItem = async (roomId: string, itemId: string, quantity: number) => {
    const session = activeSessions[roomId];
    if (!session) return;
    const updated = await SessionService.addSessionItem(session.id, itemId, quantity, role);
    setActiveSessions(prev => ({ ...prev, [roomId]: updated }));
    await refreshInventory();
    await refreshLogs();
  };

  const removeSessionItem = async (roomId: string, itemId: string, quantity: number) => {
    const session = activeSessions[roomId];
    if (!session) return;
    const updated = await SessionService.removeSessionItem(session.id, itemId, quantity, role);
    setActiveSessions(prev => ({ ...prev, [roomId]: updated }));
    await refreshInventory();
    await refreshLogs();
  };

  const updateSessionNotes = async (roomId: string, notes: string) => {
    const session = activeSessions[roomId];
    if (!session) return;
    const updated = await SessionService.updateSessionNotes(session.id, notes);
    setActiveSessions(prev => ({ ...prev, [roomId]: updated }));
  };

  const updateSessionDiscounts = async (roomId: string, discountValue: number, discountType: DiscountType) => {
    const session = activeSessions[roomId];
    if (!session) return;
    const updated = await SessionService.updateSessionDiscounts(session.id, discountValue, discountType, role);
    setActiveSessions(prev => ({ ...prev, [roomId]: updated }));
    await refreshLogs();
  };

  const checkoutSession = async (
    roomId: string,
    discountValue: number,
    discountType: DiscountType,
    paymentMethod: PaymentMethod,
    notes?: string
  ): Promise<Receipt> => {
    const session = activeSessions[roomId];
    if (!session) throw new Error('No session active for checkout');

    const room = rooms.find(r => r.id === roomId);
    if (!room) throw new Error('Room not found');

    const charges = SessionService.calculateCharges(session);

    // Build Receipt
    const receiptNumber = await ReceiptRepository.getNextReceiptNumber();
    
    // Calculate final discount amount
    let discountAmount = 0;
    const subtotal = charges.roomCharges + charges.itemCharges;
    if (discountType === 'percentage') {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }
    const finalTotal = Math.max(0, subtotal - discountAmount);

    const receipt: Receipt = {
      receiptNumber,
      sessionId: session.id,
      roomName: room.name,
      customerName: session.customerName,
      startTime: session.startTime,
      endTime: Date.now(),
      duration: charges.elapsedSeconds,
      roomCharges: charges.roomCharges,
      itemCharges: charges.itemCharges,
      items: session.items,
      discountValue,
      discountType,
      discountAmount: Number(discountAmount.toFixed(2)),
      total: Number(finalTotal.toFixed(2)),
      paymentMethod,
      notes: notes || session.notes,
      timestamp: Date.now()
    };

    // Save receipt
    await ReceiptRepository.save(receipt);

    // Complete session
    session.status = 'completed';
    session.endTime = Date.now();
    session.grandTotal = receipt.total;
    await SessionRepository.save(session);

    // Set room back to Available
    room.status = 'Available';
    await RoomRepository.save(room);

    // Clear active state
    setActiveSessions(prev => {
      const copy = { ...prev };
      delete copy[roomId];
      return copy;
    });

    // Log audit
    await AuditLogRepository.log(
      role,
      'End Session',
      `Completed session for ${room.name}. Receipt: ${receiptNumber}. Payment: ${paymentMethod.toUpperCase()}. Total: $${receipt.total}`
    );

    // Refresh state lists
    await refreshRooms();
    await refreshReceipts();
    await refreshLogs();

    return receipt;
  };

  // Configurations
  const updateRoomConfig = async (room: Room) => {
    await RoomRepository.save(room);
    await refreshRooms();
    await AuditLogRepository.log(role, 'Edit Pricing', `Modified configurations for ${room.name} (${room.category}). Rate: $${room.hourlyRate}/hr.`);
    await refreshLogs();
  };

  const bulkApplyRate = async (rate: number) => {
    const updatedRooms = rooms.map(r => ({ ...r, hourlyRate: rate }));
    for (const r of updatedRooms) {
      await RoomRepository.save(r);
    }
    await refreshRooms();
    await AuditLogRepository.log(role, 'Edit Pricing', `Bulk applied hourly rate of $${rate}/hr to all rooms.`);
    await refreshLogs();
  };

  const saveSettings = async (newSettings: SystemSettings) => {
    await SettingRepository.saveSettings(newSettings);
    setSettings(newSettings);
    await AuditLogRepository.log(role, 'Change Settings', 'Updated system preferences and localizations.');
    await refreshLogs();
  };

  // Inventory Operations
  const saveInventoryItem = async (item: InventoryItem) => {
    await InventoryRepository.save(item);
    await refreshInventory();
    await AuditLogRepository.log(role, 'Edit Inventory', `Saved inventory item ${item.nameEnglish} (Stock: ${item.stockQuantity}).`);
    await refreshLogs();
  };

  const deleteInventoryItem = async (id: string) => {
    const item = inventory.find(i => i.id === id);
    await InventoryRepository.delete(id);
    await refreshInventory();
    if (item) {
      await AuditLogRepository.log(role, 'Edit Inventory', `Deleted inventory item ${item.nameEnglish}.`);
      await refreshLogs();
    }
  };

  // Backup Operations
  const createManualBackup = async () => {
    await BackupService.createBackup('manual', role);
    await refreshBackups();
    await refreshLogs();
  };

  const restoreBackup = async (backupId: string) => {
    await BackupService.restoreFromBackup(backupId, role);
    
    // Reload state after restoration
    const dbSettings = await SettingRepository.getSettings();
    setSettings(dbSettings);
    setRooms(await RoomRepository.getAll());
    setInventory(await InventoryRepository.getAll());
    setReceipts(await ReceiptRepository.getAll());
    setLogs(await AuditLogRepository.getAll());
    setBackups(await BackupService.getAllBackups());

    // Resolve sessions
    const dbSessions = await SessionRepository.getAll();
    const active: { [roomId: string]: Session } = {};
    for (const s of dbSessions) {
      if (s.status !== 'completed') active[s.roomId] = s;
    }
    setActiveSessions(active);
  };

  const importBackupFile = async (jsonString: string) => {
    await BackupService.restoreFromJSON(jsonString, role);
    
    // Reload state after import restoration
    const dbSettings = await SettingRepository.getSettings();
    setSettings(dbSettings);
    setRooms(await RoomRepository.getAll());
    setInventory(await InventoryRepository.getAll());
    setReceipts(await ReceiptRepository.getAll());
    setLogs(await AuditLogRepository.getAll());
    setBackups(await BackupService.getAllBackups());

    const dbSessions = await SessionRepository.getAll();
    const active: { [roomId: string]: Session } = {};
    for (const s of dbSessions) {
      if (s.status !== 'completed') active[s.roomId] = s;
    }
    setActiveSessions(active);
  };

  const deleteBackup = async (backupId: string) => {
    await BackupService.deleteBackup(backupId);
    await refreshBackups();
  };

  return (
    <POSContext.Provider
      value={{
        rooms,
        inventory,
        receipts,
        logs,
        backups,
        settings,
        activeSessions,
        currentShift,
        loading,
        openShift,
        closeShift,
        startSession,
        pauseSession,
        resumeSession,
        addMinutes,
        addSessionItem,
        removeSessionItem,
        updateSessionNotes,
        updateSessionDiscounts,
        checkoutSession,
        updateRoomConfig,
        bulkApplyRate,
        saveSettings,
        saveInventoryItem,
        deleteInventoryItem,
        createManualBackup,
        restoreBackup,
        importBackupFile,
        deleteBackup
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
