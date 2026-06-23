export type RoomCategory = 'PS5' | 'PS4' | 'VIP' | 'Standard';
export type RoomStatus = 'Available' | 'Active' | 'Paused' | 'Maintenance';

export interface Room {
  id: string;
  name: string;
  category: RoomCategory;
  hourlyRate: number;
  icon: string;
  status: RoomStatus;
  color: string;
}

export type DiscountType = 'percentage' | 'fixed';
export type PaymentMethod = 'cash' | 'card' | 'wallet';

export interface SessionItem {
  itemId: string;
  nameEnglish: string;
  nameArabic: string;
  quantity: number;
  sellingPrice: number; // Price when added
  costPrice: number; // Cost price when added (for revenue/profit stats)
}

export interface Session {
  id: string;
  roomId: string;
  startTime: number; // Timestamp ms
  endTime: number | null; // Timestamp ms
  duration: number; // Current active duration in seconds (excluding paused time)
  customerName?: string;
  notes?: string;
  limitMinutes?: number;
  hourlyRateAtStart: number;
  items: SessionItem[];
  discountValue: number;
  discountType: DiscountType;
  grandTotal: number;
  status: 'active' | 'paused' | 'completed';
  pauseStart: number | null; // Timestamp when pause started
  totalPausedDuration: number; // Total pause duration in seconds
  lastUpdated: number; // For sync / timer survival
}

export type ItemCategory = 'Snacks' | 'Bar' | 'Hot Drinks' | 'Cold Drinks';

export interface InventoryItem {
  id: string;
  nameEnglish: string;
  nameArabic: string;
  category: ItemCategory;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  favoriteItem: boolean;
  favoriteOrder: number;
}

export interface Receipt {
  receiptNumber: string; // V30-YYYY-000001
  sessionId?: string;
  roomName: string;
  customerName?: string;
  startTime: number;
  endTime: number;
  duration: number; // In seconds
  roomCharges: number;
  itemCharges: number;
  items: SessionItem[];
  discountValue: number;
  discountType: DiscountType;
  discountAmount: number; // The calculated discount amount
  total: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  timestamp: number; // Checkout timestamp
}

export type EmployeeRole = 'admin' | 'cashier';

export interface AuditLog {
  id: string;
  timestamp: number;
  employeeRole: EmployeeRole;
  action: string;
  details: string;
}

export interface SystemSettings {
  businessName: string;
  currency: string;
  receiptFooter: string;
  language: 'en' | 'ar';
  theme: 'dark';
  printWidth: '58mm' | '80mm';
  statusColors: {
    Available: string;
    Active: string;
    Paused: string;
    Maintenance: string;
  };
}

export interface Backup {
  id: string;
  timestamp: number;
  type: 'manual' | 'auto';
  data: string; // Compressed or raw JSON string of all tables
}

export interface ShiftReport {
  openingCash: number;
  revenue: number;
  paymentBreakdown: {
    cash: number;
    card: number;
    wallet: number;
  };
  expectedCash: number;
  actualCash: number;
  difference: number;
}

export interface POSDatabase {
  settings: SystemSettings;
  rooms: Room[];
  sessions: Session[];
  inventory: InventoryItem[];
  receipts: Receipt[];
  auditLogs: AuditLog[];
}
