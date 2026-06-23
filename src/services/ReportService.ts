import { Receipt, Room, RoomStatus, ShiftReport } from '../types';
import { ReceiptRepository } from '../repositories/ReceiptRepository';
import { RoomRepository } from '../repositories/RoomRepository';

export interface DashboardStats {
  activeRoomsCount: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
}


export interface TopItemStat {
  nameEnglish: string;
  nameArabic: string;
  category: string;
  quantity: number;
  revenue: number;
}

export interface TopRoomStat {
  roomName: string;
  sessionCount: number;
  revenue: number;
}

export interface StatisticsReport {
  sessionCount: number;
  averageSessionDurationMinutes: number;
  topSellingItems: TopItemStat[];
  topRevenueRooms: TopRoomStat[];
}

export class ReportService {
  private static startOfDay(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private static startOfWeek(date: Date): number {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
  }

  private static startOfMonth(date: Date): number {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  public static async getDashboardStats(): Promise<DashboardStats> {
    const rooms = await RoomRepository.getAll();
    const receipts = await ReceiptRepository.getAll();
    const now = new Date();

    const activeRoomsCount = rooms.filter(
      r => r.status === 'Active' || r.status === 'Paused'
    ).length;

    const todayMs = this.startOfDay(now);
    const weekMs = this.startOfWeek(now);
    const monthMs = this.startOfMonth(now);

    let revenueToday = 0;
    let revenueThisWeek = 0;
    let revenueThisMonth = 0;

    for (const receipt of receipts) {
      if (receipt.timestamp >= todayMs) {
        revenueToday += receipt.total;
      }
      if (receipt.timestamp >= weekMs) {
        revenueThisWeek += receipt.total;
      }
      if (receipt.timestamp >= monthMs) {
        revenueThisMonth += receipt.total;
      }
    }

    return {
      activeRoomsCount,
      revenueToday: Number(revenueToday.toFixed(2)),
      revenueThisWeek: Number(revenueThisWeek.toFixed(2)),
      revenueThisMonth: Number(revenueThisMonth.toFixed(2))
    };
  }

  public static async getCurrentShiftReport(openingCash: number, actualCash: number): Promise<ShiftReport> {
    const receipts = await ReceiptRepository.getAll();
    const todayMs = this.startOfDay(new Date());

    // We calculate shift revenue based on today's receipts for simplicity,
    // or since the last shift reset. Let's assume today's receipts.
    const shiftReceipts = receipts.filter(r => r.timestamp >= todayMs);

    let cashRevenue = 0;
    let cardRevenue = 0;
    let walletRevenue = 0;
    let totalRevenue = 0;

    for (const r of shiftReceipts) {
      totalRevenue += r.total;
      if (r.paymentMethod === 'cash') {
        cashRevenue += r.total;
      } else if (r.paymentMethod === 'card') {
        cardRevenue += r.total;
      } else if (r.paymentMethod === 'wallet') {
        walletRevenue += r.total;
      }
    }

    const expectedCash = openingCash + cashRevenue;
    const difference = actualCash - expectedCash;

    return {
      openingCash,
      revenue: Number(totalRevenue.toFixed(2)),
      paymentBreakdown: {
        cash: Number(cashRevenue.toFixed(2)),
        card: Number(cardRevenue.toFixed(2)),
        wallet: Number(walletRevenue.toFixed(2))
      },
      expectedCash: Number(expectedCash.toFixed(2)),
      actualCash: Number(actualCash.toFixed(2)),
      difference: Number(difference.toFixed(2))
    };
  }

  public static async getStatisticsReport(): Promise<StatisticsReport> {
    const receipts = await ReceiptRepository.getAll();

    const sessionCount = receipts.length;
    
    // Average duration
    const totalDuration = receipts.reduce((sum, r) => sum + r.duration, 0);
    const averageSessionDurationMinutes = sessionCount > 0 
      ? Math.round((totalDuration / sessionCount) / 60) 
      : 0;

    // Top selling items
    const itemMap = new Map<string, { nameEnglish: string; nameArabic: string; category: string; qty: number; rev: number }>();
    
    // Top revenue rooms
    const roomMap = new Map<string, { count: number; rev: number }>();

    for (const r of receipts) {
      // Accumulate rooms
      const roomKey = r.roomName;
      const existingRoom = roomMap.get(roomKey) || { count: 0, rev: 0 };
      roomMap.set(roomKey, {
        count: existingRoom.count + 1,
        rev: existingRoom.rev + r.roomCharges + r.items.reduce((s, i) => s + i.quantity * i.sellingPrice, 0)
      });

      // Accumulate items
      for (const item of r.items) {
        const existingItem = itemMap.get(item.itemId) || {
          nameEnglish: item.nameEnglish,
          nameArabic: item.nameArabic,
          category: 'Drinks', // Categorization logic if available, we'll keep default
          qty: 0,
          rev: 0
        };
        
        itemMap.set(item.itemId, {
          ...existingItem,
          qty: existingItem.qty + item.quantity,
          rev: existingItem.rev + (item.quantity * item.sellingPrice)
        });
      }
    }

    const topSellingItems: TopItemStat[] = Array.from(itemMap.values())
      .map(item => ({
        nameEnglish: item.nameEnglish,
        nameArabic: item.nameArabic,
        category: item.category,
        quantity: item.qty,
        revenue: Number(item.rev.toFixed(2))
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const topRevenueRooms: TopRoomStat[] = Array.from(roomMap.entries())
      .map(([roomName, data]) => ({
        roomName,
        sessionCount: data.count,
        revenue: Number(data.rev.toFixed(2))
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      sessionCount,
      averageSessionDurationMinutes,
      topSellingItems,
      topRevenueRooms
    };
  }

  // Export functions helper
  public static convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
        // Escape quotes
        return `"${valStr.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}
