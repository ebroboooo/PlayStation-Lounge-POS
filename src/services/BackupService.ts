import { Backup, Room, Session, InventoryItem, Receipt, AuditLog, SystemSettings } from '../types';
import { IndexedDBManager } from '../db/db';
import { RoomRepository } from '../repositories/RoomRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { InventoryRepository } from '../repositories/InventoryRepository';
import { ReceiptRepository } from '../repositories/ReceiptRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { SettingRepository } from '../repositories/SettingRepository';

export class BackupService {
  /**
   * Generates a full system backup and saves it in IndexedDB.
   * Auto-prunes older backups to keep at most 10.
   */
  public static async createBackup(type: 'manual' | 'auto', role: 'admin' | 'cashier' = 'cashier'): Promise<Backup> {
    const settings = await SettingRepository.getSettings();
    const rooms = await RoomRepository.getAll();
    const sessions = await SessionRepository.getAll();
    const inventory = await InventoryRepository.getAll();
    const receipts = await ReceiptRepository.getAll();
    const auditLogs = await AuditLogRepository.getAll();

    const backupData = {
      settings,
      rooms,
      sessions,
      inventory,
      receipts,
      auditLogs
    };

    const timestamp = Date.now();
    const backup: Backup = {
      id: `backup-${timestamp}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp,
      type,
      data: JSON.stringify(backupData)
    };

    // Save backup
    await IndexedDBManager.put('backups', backup);

    // Keep last 10 backups
    const allBackups = await IndexedDBManager.getAll<Backup>('backups');
    allBackups.sort((a, b) => b.timestamp - a.timestamp); // Newest first

    if (allBackups.length > 10) {
      const backupsToDelete = allBackups.slice(10);
      for (const oldBackup of backupsToDelete) {
        await IndexedDBManager.delete('backups', oldBackup.id);
      }
    }

    await AuditLogRepository.log(
      type === 'auto' ? 'admin' : role,
      'Create Backup',
      `Created ${type} backup: ${backup.id}`
    );

    return backup;
  }

  public static async getAllBackups(): Promise<Backup[]> {
    const backups = await IndexedDBManager.getAll<Backup>('backups');
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }

  public static async deleteBackup(id: string): Promise<void> {
    await IndexedDBManager.delete('backups', id);
  }

  /**
   * Restores the complete POS state from a backup object.
   */
  public static async restoreFromBackup(backupId: string, role: 'admin' | 'cashier' = 'admin'): Promise<void> {
    const backup = await IndexedDBManager.get<Backup>('backups', backupId);
    if (!backup) throw new Error('Backup not found');

    await this.restoreFromJSON(backup.data, role);
  }

  /**
   * Validates and restores POS state from a raw JSON string.
   */
  public static async restoreFromJSON(jsonString: string, role: 'admin' | 'cashier' = 'admin'): Promise<void> {
    const backupData = JSON.parse(jsonString);

    // Basic structure validation
    if (
      !backupData.settings ||
      !Array.isArray(backupData.rooms) ||
      !Array.isArray(backupData.sessions) ||
      !Array.isArray(backupData.inventory) ||
      !Array.isArray(backupData.receipts) ||
      !Array.isArray(backupData.auditLogs)
    ) {
      throw new Error('Invalid backup file structure');
    }

    // Validate record identities before touching the live database.
    const tables: [string, unknown[], string][] = [
      ['rooms', backupData.rooms, 'id'],
      ['sessions', backupData.sessions, 'id'],
      ['inventory', backupData.inventory, 'id'],
      ['receipts', backupData.receipts, 'receiptNumber'],
      ['audit_logs', backupData.auditLogs, 'id']
    ];
    if (typeof backupData.settings !== 'object' || Array.isArray(backupData.settings) ||
        typeof backupData.settings.businessName !== 'string' ||
        typeof backupData.settings.currency !== 'string' ||
        !backupData.settings.statusColors) {
      throw new Error('Invalid backup settings');
    }
    for (const [name, rows, key] of tables) {
      const seen = new Set<string>();
      for (const row of rows) {
        const id = row && typeof row === 'object' ? (row as Record<string, unknown>)[key] : undefined;
        if (typeof id !== 'string' || !id.trim() || seen.has(id)) {
          throw new Error('Invalid or duplicate record key in ' + name);
        }
        seen.add(id);
      }
    }

    // Restore all stores atomically. A failed write rolls back every clear and put.
    const db = await IndexedDBManager.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['settings', ...tables.map(([name]) => name)], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Backup restoration aborted'));
      try {
        const settings = tx.objectStore('settings');
        settings.clear();
        settings.put(backupData.settings, 'current_settings');
        for (const [name, rows] of tables) {
          const store = tx.objectStore(name);
          store.clear();
          for (const row of rows) store.add(row);
        }
        tx.objectStore('audit_logs').add({
          id: 'restore-' + crypto.randomUUID(),
          timestamp: Date.now(),
          employeeRole: role,
          action: 'Restore Backup',
          details: 'Restored ' + backupData.rooms.length + ' rooms, ' +
            backupData.inventory.length + ' inventory items and ' + backupData.receipts.length + ' receipts.'
        });
      } catch (error) {
        try { tx.abort(); } catch { /* already aborted */ }
        reject(error);
      }
    });
  }
}
