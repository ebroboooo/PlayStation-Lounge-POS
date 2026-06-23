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

    // Clear existing tables
    await IndexedDBManager.clear('settings');
    await IndexedDBManager.clear('rooms');
    await IndexedDBManager.clear('sessions');
    await IndexedDBManager.clear('inventory');
    await IndexedDBManager.clear('receipts');
    await IndexedDBManager.clear('audit_logs');

    // Populate data
    await SettingRepository.saveSettings(backupData.settings);
    
    for (const r of backupData.rooms) {
      await RoomRepository.save(r);
    }
    for (const s of backupData.sessions) {
      await SessionRepository.save(s);
    }
    for (const i of backupData.inventory) {
      await InventoryRepository.save(i);
    }
    for (const rcpt of backupData.receipts) {
      await ReceiptRepository.save(rcpt);
    }
    for (const log of backupData.auditLogs) {
      await AuditLogRepository.save(log);
    }

    await AuditLogRepository.log(
      role,
      'Restore Backup',
      `Restored system state from backup containing: ${backupData.rooms.length} rooms, ${backupData.inventory.length} inventory items, ${backupData.receipts.length} receipts.`
    );
  }
}
