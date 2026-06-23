import { Session, Room, InventoryItem, DiscountType, SessionItem } from '../types';
import { SessionRepository } from '../repositories/SessionRepository';
import { RoomRepository } from '../repositories/RoomRepository';
import { InventoryRepository } from '../repositories/InventoryRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';

export interface ExtendedSessionInfo extends Session {
  elapsedSeconds: number;
  roomCharges: number;
  itemCharges: number;
  discountAmount: number;
  calculatedGrandTotal: number;
}

export class SessionService {
  /**
   * Helper to compute session charges in real-time
   */
  public static calculateCharges(session: Session, currentTime = Date.now()): {
    elapsedSeconds: number;
    roomCharges: number;
    itemCharges: number;
    discountAmount: number;
    grandTotal: number;
  } {
    let elapsedSeconds = session.duration;
    
    if (session.status === 'active') {
      const totalElapsedSec = Math.max(0, Math.floor((currentTime - session.startTime) / 1000));
      elapsedSeconds = Math.max(0, totalElapsedSec - session.totalPausedDuration);
    } else if (session.status === 'paused' && session.pauseStart) {
      const totalElapsedSec = Math.max(0, Math.floor((session.pauseStart - session.startTime) / 1000));
      elapsedSeconds = Math.max(0, totalElapsedSec - session.totalPausedDuration);
    }

    // Room charges calculation
    let roomCharges = 0;
    if (session.hourlyRateAtStart > 0) {
      if (session.limitMinutes && session.limitMinutes > 0) {
        // Limited session charges based on the allocated limit
        roomCharges = (session.limitMinutes / 60) * session.hourlyRateAtStart;
      } else {
        // Open session charges pro-rated per second
        roomCharges = (elapsedSeconds / 3600) * session.hourlyRateAtStart;
      }
    }

    // Item charges
    const itemCharges = session.items.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);

    // Discount charges
    let discountAmount = 0;
    if (session.discountType === 'percentage') {
      discountAmount = (roomCharges + itemCharges) * (session.discountValue / 100);
    } else {
      discountAmount = session.discountValue;
    }

    const grandTotal = Math.max(0, roomCharges + itemCharges - discountAmount);

    return {
      elapsedSeconds,
      roomCharges: Number(roomCharges.toFixed(2)),
      itemCharges: Number(itemCharges.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2))
    };
  }

  // Check and extend a session with limit checking if it reaches the limit
  public static getLimitMinutes(session: Session): number | undefined {
    return session.limitMinutes;
  }

  public static async startSession(
    roomId: string,
    customerName?: string,
    limitMinutes?: number,
    role: 'admin' | 'cashier' = 'cashier'
  ): Promise<Session> {
    const room = await RoomRepository.getById(roomId);
    if (!room) throw new Error('Room not found');
    if (room.status === 'Maintenance') throw new Error('Room is in maintenance mode');
    if (room.status === 'Active' || room.status === 'Paused') throw new Error('Room already has an active session');

    const activeSession = await SessionRepository.getActiveSessionByRoomId(roomId);
    if (activeSession) throw new Error('Room already has an active session in DB');

    const now = Date.now();
    const session: Session & { limitMinutes?: number } = {
      id: `session-${now}-${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      startTime: now,
      endTime: null,
      duration: 0,
      customerName: customerName || '',
      notes: '',
      hourlyRateAtStart: room.hourlyRate,
      items: [],
      discountValue: 0,
      discountType: 'fixed',
      grandTotal: 0,
      status: 'active',
      pauseStart: null,
      totalPausedDuration: 0,
      lastUpdated: now,
      limitMinutes: limitMinutes && limitMinutes > 0 ? limitMinutes : undefined
    };

    // Save session
    await SessionRepository.save(session as Session);

    // Update room status
    room.status = 'Active';
    await RoomRepository.save(room);

    // Audit log
    await AuditLogRepository.log(
      role,
      'Start Session',
      `Started session for ${room.name} (${room.category}) at rate $${room.hourlyRate}/hr. ${
        limitMinutes ? `Limit: ${limitMinutes} min.` : 'Open session.'
      } ${customerName ? `Customer: ${customerName}` : ''}`
    );

    return session as Session;
  }

  public static async pauseSession(sessionId: string, role: 'admin' | 'cashier' = 'cashier'): Promise<Session> {
    const session = await SessionRepository.getById(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'active') throw new Error('Session is not active');

    const room = await RoomRepository.getById(session.roomId);
    if (!room) throw new Error('Room not found');

    const now = Date.now();
    session.status = 'paused';
    session.pauseStart = now;
    session.lastUpdated = now;

    // Recalculate duration before pausing
    const charges = this.calculateCharges(session, now);
    session.duration = charges.elapsedSeconds;

    await SessionRepository.save(session);

    room.status = 'Paused';
    await RoomRepository.save(room);

    await AuditLogRepository.log(role, 'Pause Session', `Paused session for ${room.name}`);
    return session;
  }

  public static async resumeSession(sessionId: string, role: 'admin' | 'cashier' = 'cashier'): Promise<Session> {
    const session = await SessionRepository.getById(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'paused' || !session.pauseStart) throw new Error('Session is not paused');

    const room = await RoomRepository.getById(session.roomId);
    if (!room) throw new Error('Room not found');

    const now = Date.now();
    const pausedSeconds = Math.max(0, Math.floor((now - session.pauseStart) / 1000));
    session.totalPausedDuration += pausedSeconds;
    session.status = 'active';
    session.pauseStart = null;
    session.lastUpdated = now;

    await SessionRepository.save(session);

    room.status = 'Active';
    await RoomRepository.save(room);

    await AuditLogRepository.log(role, 'Resume Session', `Resumed session for ${room.name}`);
    return session;
  }

  public static async addMinutes(sessionId: string, minutes: number, role: 'admin' | 'cashier' = 'cashier'): Promise<Session> {
    const session = await SessionRepository.getById(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status === 'completed') throw new Error('Session is completed');

    const room = await RoomRepository.getById(session.roomId);
    const roomName = room ? room.name : 'Unknown Room';

    const charges = this.calculateCharges(session);
    const elapsedMinutes = Math.floor(charges.elapsedSeconds / 60);

    let oldLimit = session.limitMinutes;
    if (session.limitMinutes && session.limitMinutes > 0) {
      session.limitMinutes += minutes;
    } else {
      // Convert open session to a limited session
      session.limitMinutes = elapsedMinutes + minutes;
    }

    session.lastUpdated = Date.now();
    await SessionRepository.save(session);

    await AuditLogRepository.log(
      role,
      'Add Minutes',
      `Added ${minutes} minutes to session for ${roomName}. Limit changed from ${oldLimit || 'Open'} to ${session.limitMinutes} min.`
    );

    return session;
  }

  public static async addSessionItem(
    sessionId: string,
    itemId: string,
    quantity: number,
    role: 'admin' | 'cashier' = 'cashier'
  ): Promise<Session> {
    const session = await SessionRepository.getById(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status === 'completed') throw new Error('Session is completed');

    const item = await InventoryRepository.getById(itemId);
    if (!item) throw new Error('Item not found');

    if (item.stockQuantity < quantity) {
      throw new Error(`Insufficient stock for ${item.nameEnglish}. Only ${item.stockQuantity} available.`);
    }

    // Deduct stock
    item.stockQuantity -= quantity;
    await InventoryRepository.save(item);

    // Add to session items
    const existingIndex = session.items.findIndex(i => i.itemId === itemId);
    if (existingIndex > -1) {
      session.items[existingIndex].quantity += quantity;
    } else {
      session.items.push({
        itemId: item.id,
        nameEnglish: item.nameEnglish,
        nameArabic: item.nameArabic,
        quantity,
        sellingPrice: item.sellingPrice,
        costPrice: item.costPrice
      });
    }

    session.lastUpdated = Date.now();
    
    // Recalculate and save
    const charges = this.calculateCharges(session);
    session.grandTotal = charges.grandTotal;
    await SessionRepository.save(session);

    await AuditLogRepository.log(
      role,
      'Add Item',
      `Added ${quantity}x ${item.nameEnglish} to ${session.customerName || 'session'} (Room ID: ${session.roomId})`
    );

    return session;
  }

  public static async removeSessionItem(
    sessionId: string,
    itemId: string,
    quantity: number,
    role: 'admin' | 'cashier' = 'cashier'
  ): Promise<Session> {
    const session = await SessionRepository.getById(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status === 'completed') throw new Error('Session is completed');

    const existingIndex = session.items.findIndex(i => i.itemId === itemId);
    if (existingIndex === -1) throw new Error('Item not found in session');

    const sessionItem = session.items[existingIndex];
    if (sessionItem.quantity < quantity) throw new Error('Cannot remove more items than exist in session');

    const item = await InventoryRepository.getById(itemId);
    if (item) {
      // Re-add stock
      item.stockQuantity += quantity;
      await InventoryRepository.save(item);
    }

    if (sessionItem.quantity === quantity) {
      session.items.splice(existingIndex, 1);
    } else {
      sessionItem.quantity -= quantity;
    }

    session.lastUpdated = Date.now();

    const charges = this.calculateCharges(session);
    session.grandTotal = charges.grandTotal;
    await SessionRepository.save(session);

    await AuditLogRepository.log(
      role,
      'Remove Item',
      `Removed ${quantity}x ${sessionItem.nameEnglish} from session (Room ID: ${session.roomId})`
    );

    return session;
  }

  public static async updateSessionDiscounts(
    sessionId: string,
    discountValue: number,
    discountType: DiscountType,
    role: 'admin' | 'cashier' = 'cashier'
  ): Promise<Session> {
    const session = await SessionRepository.getById(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status === 'completed') throw new Error('Session is completed');

    session.discountValue = discountValue;
    session.discountType = discountType;
    session.lastUpdated = Date.now();

    const charges = this.calculateCharges(session);
    session.grandTotal = charges.grandTotal;
    await SessionRepository.save(session);

    await AuditLogRepository.log(
      role,
      'Add Discount',
      `Applied discount: ${discountValue}${discountType === 'percentage' ? '%' : ' USD'} to session (Room ID: ${session.roomId})`
    );

    return session;
  }

  public static async updateSessionNotes(
    sessionId: string,
    notes: string
  ): Promise<Session> {
    const session = await SessionRepository.getById(sessionId);
    if (!session) throw new Error('Session not found');
    session.notes = notes;
    await SessionRepository.save(session);
    return session;
  }
}
