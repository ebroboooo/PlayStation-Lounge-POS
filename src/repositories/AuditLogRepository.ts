import { AuditLog, EmployeeRole } from '../types';
import { IndexedDBManager } from '../db/db';

export class AuditLogRepository {
  public static async getAll(): Promise<AuditLog[]> {
    const logs = await IndexedDBManager.getAll<AuditLog>('audit_logs');
    // Sort by timestamp descending (newest logs first)
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  public static async save(log: AuditLog): Promise<void> {
    return IndexedDBManager.put('audit_logs', log);
  }

  public static async log(employeeRole: EmployeeRole, action: string, details: string): Promise<void> {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      employeeRole,
      action,
      details
    };
    await this.save(log);
  }

  public static async clearAll(): Promise<void> {
    return IndexedDBManager.clear('audit_logs');
  }
}
