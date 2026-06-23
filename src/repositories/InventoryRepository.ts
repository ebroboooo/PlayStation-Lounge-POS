import { InventoryItem } from '../types';
import { IndexedDBManager } from '../db/db';

export class InventoryRepository {
  public static async getAll(): Promise<InventoryItem[]> {
    const items = await IndexedDBManager.getAll<InventoryItem>('inventory');
    // Ensure they are sorted by favoriteOrder for favorite items, then name
    return items.sort((a, b) => {
      if (a.favoriteItem && b.favoriteItem) {
        return a.favoriteOrder - b.favoriteOrder;
      }
      if (a.favoriteItem) return -1;
      if (b.favoriteItem) return 1;
      return a.nameEnglish.localeCompare(b.nameEnglish);
    });
  }

  public static async getById(id: string): Promise<InventoryItem | null> {
    return IndexedDBManager.get<InventoryItem>('inventory', id);
  }

  public static async save(item: InventoryItem): Promise<void> {
    return IndexedDBManager.put('inventory', item);
  }

  public static async delete(id: string): Promise<void> {
    return IndexedDBManager.delete('inventory', id);
  }
}
