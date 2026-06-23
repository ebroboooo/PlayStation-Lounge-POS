import { Session } from '../types';
import { IndexedDBManager } from '../db/db';

export class SessionRepository {
  public static async getAll(): Promise<Session[]> {
    return IndexedDBManager.getAll<Session>('sessions');
  }

  public static async getById(id: string): Promise<Session | null> {
    return IndexedDBManager.get<Session>('sessions', id);
  }

  public static async save(session: Session): Promise<void> {
    return IndexedDBManager.put('sessions', session);
  }

  public static async delete(id: string): Promise<void> {
    return IndexedDBManager.delete('sessions', id);
  }

  public static async getActiveSessionByRoomId(roomId: string): Promise<Session | null> {
    const sessions = await this.getAll();
    return sessions.find(s => s.roomId === roomId && s.status !== 'completed') || null;
  }
}
