import { SystemSettings } from '../types';
import { IndexedDBManager } from '../db/db';

export class SettingRepository {
  private static readonly KEY = 'current_settings';

  public static async getSettings(): Promise<SystemSettings> {
    const settings = await IndexedDBManager.get<SystemSettings>('settings', this.KEY);
    if (!settings) {
      // Fallback in case settings are missing from DB
      const fallbackSettings: SystemSettings = {
        businessName: 'LoungeLink POS',
        currency: 'USD',
        receiptFooter: 'Thank you for playing! Visit us again soon.',
        language: 'en',
        theme: 'dark',
        printWidth: '80mm',
        statusColors: {
          Available: '#22c55e',
          Active: '#3b82f6',
          Paused: '#f59e0b',
          Maintenance: '#eab308'
        }
      };
      await IndexedDBManager.put('settings', fallbackSettings, this.KEY);
      return fallbackSettings;
    }
    // Preserve customer-chosen names and existing financial records. Migrate only the old product defaults.
    const migrated = {
      ...settings,
      businessName: ['Villa 30 PlayStation Lounge', 'Villa 30 Lounge', 'Villa 30'].includes(settings.businessName) ? 'LoungeLink POS' : settings.businessName,
      receiptFooter: settings.receiptFooter === 'Thank you for playing at Villa 30! Visit us again soon.' ? 'Thank you for playing! Visit us again soon.' : settings.receiptFooter
    };
    if (migrated.businessName !== settings.businessName || migrated.receiptFooter !== settings.receiptFooter) {
      await IndexedDBManager.put('settings', migrated, this.KEY);
    }
    return migrated;
  }

  public static async saveSettings(settings: SystemSettings): Promise<void> {
    return IndexedDBManager.put('settings', settings, this.KEY);
  }
}
