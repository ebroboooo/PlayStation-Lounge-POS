import { Room } from '../types';
import { IndexedDBManager } from '../db/db';

export class RoomRepository {
  public static async getAll(): Promise<Room[]> {
    return IndexedDBManager.getAll<Room>('rooms');
  }

  public static async getById(id: string): Promise<Room | null> {
    return IndexedDBManager.get<Room>('rooms', id);
  }

  public static async save(room: Room): Promise<void> {
    return IndexedDBManager.put('rooms', room);
  }

  public static async delete(id: string): Promise<void> {
    return IndexedDBManager.delete('rooms', id);
  }
}
