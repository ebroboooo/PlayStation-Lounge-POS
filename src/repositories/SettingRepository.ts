import { SystemSettings } from '../types';
import { IndexedDBManager } from '../db/db';

export class SettingRepository {
  private static readonly KEY = 'current_settings';

  public static async getSettings(): Promise<SystemSettings> {
    const settings = await IndexedDBManager.get<SystemSettings>('settings', this.KEY);
    if (!settings) {
      // Fallback in case settings are missing from DB
      const fallbackSettings: SystemSettings = {
        businessName: 'Villa 30 PlayStation Lounge',
        currency: 'USD',
        receiptFooter: 'Thank you for playing at Villa 30! Visit us again soon.',
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
    return settings;
  }

  public static async saveSettings(settings: SystemSettings): Promise<void> {
    return IndexedDBManager.put('settings', settings, this.KEY);
  }
}
