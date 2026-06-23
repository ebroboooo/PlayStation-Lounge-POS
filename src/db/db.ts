import { Room, InventoryItem, SystemSettings } from '../types';

const DB_NAME = 'Villa30POS';
const DB_VERSION = 1;

export class IndexedDBManager {
  private static db: IDBDatabase | null = null;

  public static async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create Object Stores
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('rooms')) {
          db.createObjectStore('rooms', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('inventory')) {
          db.createObjectStore('inventory', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('receipts')) {
          db.createObjectStore('receipts', { keyPath: 'receiptNumber' });
        }
        if (!db.objectStoreNames.contains('audit_logs')) {
          db.createObjectStore('audit_logs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      };
    });
  }

  public static async executeTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest | Promise<any>
  ): Promise<T> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);

      let requestResult: any;

      transaction.oncomplete = () => {
        resolve(requestResult);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };

      const result = callback(store);
      if (result instanceof Promise) {
        result.then(() => {}).catch(reject);
      } else {
        result.onsuccess = (event) => {
          requestResult = (event.target as IDBRequest).result;
        };
      }
    });
  }

  // Repository standard helper methods
  public static async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public static async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  public static async put<T>(storeName: string, value: T, key?: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = key !== undefined ? store.put(value, key) : store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public static async delete(storeName: string, key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public static async clear(storeName: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Seeding operation
  public static async initializeSeedData(): Promise<void> {
    const settings = await this.get<SystemSettings>('settings', 'current_settings');
    if (!settings) {
      // Seed default settings
      const defaultSettings: SystemSettings = {
        businessName: 'Villa 30 PlayStation Lounge',
        currency: 'USD',
        receiptFooter: 'Thank you for playing at Villa 30! Visit us again soon.',
        language: 'en',
        theme: 'dark',
        printWidth: '80mm',
        statusColors: {
          Available: '#22c55e', // Green
          Active: '#3b82f6',    // Blue
          Paused: '#f59e0b',    // Orange
          Maintenance: '#eab308' // Yellow
        }
      };
      await this.put('settings', defaultSettings, 'current_settings');

      // Seed default rooms
      const defaultRooms: Room[] = [
        { id: 'room-1', name: 'Room 1', category: 'PS5', hourlyRate: 10.0, icon: 'Gamepad', status: 'Available', color: '#22c55e' },
        { id: 'room-2', name: 'Room 2', category: 'PS5', hourlyRate: 10.0, icon: 'Gamepad', status: 'Available', color: '#22c55e' },
        { id: 'room-3', name: 'Room 3', category: 'PS4', hourlyRate: 6.0, icon: 'Monitor', status: 'Available', color: '#22c55e' },
        { id: 'room-4', name: 'Room 4', category: 'PS4', hourlyRate: 6.0, icon: 'Monitor', status: 'Available', color: '#22c55e' },
        { id: 'room-5', name: 'Room 5', category: 'VIP', hourlyRate: 20.0, icon: 'Crown', status: 'Available', color: '#22c55e' },
        { id: 'room-6', name: 'Room 6', category: 'Standard', hourlyRate: 5.0, icon: 'Sofa', status: 'Available', color: '#22c55e' }
      ];
      for (const room of defaultRooms) {
        await this.put('rooms', room);
      }

      // Seed default inventory items
      const defaultInventory: InventoryItem[] = [
        { id: 'inv-1', nameEnglish: 'Pepsi', nameArabic: 'ببسي', category: 'Cold Drinks', costPrice: 0.5, sellingPrice: 1.5, stockQuantity: 100, lowStockThreshold: 15, favoriteItem: true, favoriteOrder: 0 },
        { id: 'inv-2', nameEnglish: 'Water', nameArabic: 'مياه', category: 'Cold Drinks', costPrice: 0.2, sellingPrice: 0.75, stockQuantity: 150, lowStockThreshold: 20, favoriteItem: true, favoriteOrder: 1 },
        { id: 'inv-3', nameEnglish: 'Coffee', nameArabic: 'قهوة', category: 'Hot Drinks', costPrice: 0.8, sellingPrice: 2.5, stockQuantity: 50, lowStockThreshold: 10, favoriteItem: true, favoriteOrder: 2 },
        { id: 'inv-4', nameEnglish: 'Tea', nameArabic: 'شاي', category: 'Hot Drinks', costPrice: 0.3, sellingPrice: 1.5, stockQuantity: 80, lowStockThreshold: 10, favoriteItem: false, favoriteOrder: 99 },
        { id: 'inv-5', nameEnglish: 'Chips', nameArabic: 'شيبس', category: 'Snacks', costPrice: 0.4, sellingPrice: 1.25, stockQuantity: 120, lowStockThreshold: 15, favoriteItem: true, favoriteOrder: 3 },
        { id: 'inv-6', nameEnglish: 'Chocolate', nameArabic: 'شوكولاتة', category: 'Snacks', costPrice: 0.6, sellingPrice: 2.0, stockQuantity: 90, lowStockThreshold: 12, favoriteItem: false, favoriteOrder: 99 }
      ];
      for (const item of defaultInventory) {
        await this.put('inventory', item);
      }
    }
  }
}
