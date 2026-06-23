import React, { createContext, useContext, useState, useEffect } from 'react';
import { SettingRepository } from '../repositories/SettingRepository';

export type Language = 'en' | 'ar';

interface TranslationDictionary {
  [key: string]: {
    en: string;
    ar: string;
  };
}

const translations: TranslationDictionary = {
  // Navigation
  dashboard: { en: 'Dashboard', ar: 'لوحة التحكم' },
  rooms: { en: 'Room Management', ar: 'إدارة الغرف' },
  inventory: { en: 'Inventory', ar: 'المخزن' },
  receipts: { en: 'Receipts', ar: 'الفواتير' },
  reports: { en: 'Reports', ar: 'التقارير' },
  auditLogs: { en: 'Audit Logs', ar: 'سجل العمليات' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
  backup: { en: 'Backup System', ar: 'نظام النسخ الاحتياطي' },

  // Roles & Permissions
  roleAdmin: { en: 'Admin', ar: 'مدير النظام' },
  roleCashier: { en: 'Cashier', ar: 'الكاشير' },
  switchRole: { en: 'Switch Role', ar: 'تغيير الصلاحية' },
  permissionError: { en: 'Permission Denied: Admin access required', ar: 'تم رفض الإذن: مطلوب صلاحيات مدير النظام' },

  // Dashboard / General Statistics
  activeRooms: { en: 'Active Rooms', ar: 'الغرف النشطة' },
  revenueToday: { en: 'Revenue Today', ar: 'دخل اليوم' },
  revenueThisWeek: { en: 'Revenue This Week', ar: 'دخل الأسبوع' },
  revenueThisMonth: { en: 'Revenue This Month', ar: 'دخل الشهر' },
  sessionCount: { en: 'Session Count', ar: 'عدد الجلسات' },
  averageDuration: { en: 'Avg Session Duration', ar: 'متوسط مدة الجلسة' },
  topSellingItems: { en: 'Top Selling Items', ar: 'الأكثر مبيعاً' },
  topRevenueRooms: { en: 'Top Revenue Rooms', ar: 'الغرف الأكثر دخلاً' },
  noData: { en: 'No data available', ar: 'لا توجد بيانات متاحة' },
  minutes: { en: 'minutes', ar: 'دقائق' },
  hours: { en: 'hours', ar: 'ساعات' },

  // Room Status
  Available: { en: 'Available', ar: 'متاحة' },
  Active: { en: 'Active', ar: 'نشطة' },
  Paused: { en: 'Paused', ar: 'مؤقت' },
  Maintenance: { en: 'Maintenance', ar: 'صيانة' },

  // Room categories
  PS5: { en: 'PlayStation 5', ar: 'بلايستيشن 5' },
  PS4: { en: 'PlayStation 4', ar: 'بلايستيشن 4' },
  VIP: { en: 'VIP Lounge', ar: 'قاعة كبار الشخصيات' },
  Standard: { en: 'Standard Room', ar: 'غرفة عادية' },

  // Room Actions
  startSession: { en: 'Start Session', ar: 'بدء الجلسة' },
  pauseSession: { en: 'Pause Session', ar: 'إيقاف مؤقت' },
  resumeSession: { en: 'Resume Session', ar: 'استئناف' },
  endSession: { en: 'End Session', ar: 'إنهاء الجلسة' },
  addMinutes: { en: 'Add Minutes', ar: 'إضافة وقت' },
  viewDetails: { en: 'View Details', ar: 'عرض التفاصيل' },
  addItem: { en: 'Add Item', ar: 'إضافة منتج' },
  lockMaintenance: { en: 'Lock Maintenance', ar: 'وضع صيانة' },
  unlockMaintenance: { en: 'Unlock Maintenance', ar: 'إلغاء الصيانة' },

  // Room Dialog / Fields
  roomName: { en: 'Room Name', ar: 'اسم الغرفة' },
  hourlyRate: { en: 'Hourly Rate', ar: 'سعر الساعة' },
  roomCategory: { en: 'Category', ar: 'الفئة' },
  roomColor: { en: 'Color', ar: 'اللون' },
  roomIcon: { en: 'Icon', ar: 'أيقونة' },
  renameRoom: { en: 'Rename Room', ar: 'تعديل الاسم' },
  customerName: { en: 'Customer Name', ar: 'اسم الزبون' },
  optional: { en: 'Optional', ar: 'اختياري' },
  notes: { en: 'Notes', ar: 'ملاحظات' },
  sessionType: { en: 'Session Type', ar: 'نوع الجلسة' },
  openTime: { en: 'Open Time', ar: 'وقت مفتوح' },
  limitedTime: { en: 'Limited Time', ar: 'وقت محدد' },
  limitInMinutes: { en: 'Duration (Minutes)', ar: 'المدة (بالدقائق)' },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  save: { en: 'Save', ar: 'حفظ' },

  // Inventory
  addInventoryItem: { en: 'Add New Item', ar: 'إضافة منتج جديد' },
  editInventoryItem: { en: 'Edit Item', ar: 'تعديل منتج' },
  deleteInventoryItem: { en: 'Delete Item', ar: 'حذف منتج' },
  searchItems: { en: 'Search items...', ar: 'بحث عن منتج...' },
  nameEnglish: { en: 'Name (English)', ar: 'الاسم (إنجليزي)' },
  nameArabic: { en: 'Name (Arabic)', ar: 'الاسم (عربي)' },
  costPrice: { en: 'Cost Price', ar: 'سعر التكلفة' },
  sellingPrice: { en: 'Selling Price', ar: 'سعر البيع' },
  stockQuantity: { en: 'Stock Quantity', ar: 'الكمية بالمخزن' },
  lowStockThreshold: { en: 'Low Stock Alert Threshold', ar: 'حد التنبيه بنقص المخزون' },
  favoriteItem: { en: 'Favorite (Show on Cards)', ar: 'مفضل (عرض بالبطاقة)' },
  lowStock: { en: 'Low Stock!', ar: 'مخزون منخفض!' },
  favoriteItemsTitle: { en: 'Favorite Items (Drag to reorder)', ar: 'المنتجات المفضلة (اسحب للترتيب)' },
  allCategories: { en: 'All Categories', ar: 'جميع الفئات' },
  Drinks: { en: 'Drinks', ar: 'مشروبات' },
  Snacks: { en: 'Snacks', ar: 'مسليات' },
  Food: { en: 'Food', ar: 'مأكولات' },
  Accessories: { en: 'Accessories', ar: 'إكسسوارات' },

  // Checkout
  checkout: { en: 'Checkout & Pay', ar: 'الدفع والإنهاء' },
  roomCharges: { en: 'Room Charges', ar: 'رسوم الغرفة' },
  itemCharges: { en: 'Item Charges', ar: 'رسوم الطلبات' },
  discount: { en: 'Discount', ar: 'الخصم' },
  discountValue: { en: 'Discount Value', ar: 'قيمة الخصم' },
  discountType: { en: 'Discount Type', ar: 'نوع الخصم' },
  fixedAmount: { en: 'Fixed Amount', ar: 'مبلغ ثابت' },
  percentage: { en: 'Percentage', ar: 'نسبة مئوية' },
  paymentMethod: { en: 'Payment Method', ar: 'طريقة الدفع' },
  cash: { en: 'Cash', ar: 'نقداً (كاش)' },
  card: { en: 'Card', ar: 'بطاقة ائتمان' },
  wallet: { en: 'Wallet', ar: 'محفظة إلكترونية' },
  grandTotal: { en: 'Grand Total', ar: 'المجموع الإجمالي' },
  startTime: { en: 'Start Time', ar: 'وقت البدء' },
  endTime: { en: 'End Time', ar: 'وقت الانتهاء' },
  duration: { en: 'Duration', ar: 'المدة' },
  items: { en: 'Items', ar: 'الطلبات' },

  // Receipts & Printing
  receiptNumber: { en: 'Receipt Number', ar: 'رقم الفاتورة' },
  businessName: { en: 'Business Name', ar: 'اسم المحل' },
  receiptFooter: { en: 'Receipt Footer Note', ar: 'ملاحظة أسفل الفاتورة' },
  printReceipt: { en: 'Print Receipt', ar: 'طباعة الفاتورة' },
  reprint: { en: 'Reprint', ar: 'إعادة طباعة' },
  thermalWidth: { en: 'Thermal Width', ar: 'عرض الطباعة الحرارية' },
  searchReceipts: { en: 'Search receipts...', ar: 'بحث في الفواتير...' },
  receiptPreview: { en: 'Receipt Preview', ar: 'معاينة الفاتورة' },

  // Shifts
  shiftReport: { en: 'Shift Report', ar: 'تقرير المناوبة' },
  openingCash: { en: 'Opening Cash', ar: 'الكاش الافتتاحي' },
  actualCash: { en: 'Actual Cash', ar: 'الكاش الفعلي' },
  expectedCash: { en: 'Expected Cash', ar: 'الكاش المتوقع' },
  cashDifference: { en: 'Cash Difference', ar: 'الفارق النقدي' },
  openShift: { en: 'Open Shift', ar: 'بدء مناوبة جديدة' },
  closeShift: { en: 'Close Shift & Reconcile', ar: 'إغلاق المناوبة والمطابقة' },
  shiftSummary: { en: 'Shift Reconciliation Summary', ar: 'ملخص مطابقة العهدة' },

  // Backup & Restore
  manualBackup: { en: 'Create Manual Backup', ar: 'إنشاء نسخة احتياطية يدوية' },
  autoBackup: { en: 'Auto Backup Status', ar: 'حالة النسخ الاحتياطي التلقائي' },
  backupsList: { en: 'Backups List', ar: 'قائمة النسخ الاحتياطية' },
  restore: { en: 'Restore', ar: 'استعادة' },
  export: { en: 'Export File', ar: 'تصدير ملف' },
  import: { en: 'Import Backup File', ar: 'استيراد ملف نسخة احتياطية' },
  delete: { en: 'Delete', ar: 'حذف' },
  backupSuccess: { en: 'Backup created successfully!', ar: 'تم إنشاء النسخة الاحتياطية بنجاح!' },
  restoreSuccess: { en: 'System restored successfully!', ar: 'تم استعادة النظام بنجاح!' },
  importSuccess: { en: 'Backup imported successfully!', ar: 'تم استيراد النسخة الاحتياطية بنجاح!' },
  autoBackupLabel: { en: 'Every 30 Minutes (Last 10 retained)', ar: 'كل 30 دقيقة (الاحتفاظ بآخر 10 نسخ)' },

  // Settings
  editSettings: { en: 'System Configuration', ar: 'تكوين النظام' },
  statusColorsTitle: { en: 'Room Status Colors', ar: 'ألوان حالات الغرف' },
  bulkApplyRate: { en: 'Bulk Apply Rate to All Rooms', ar: 'تطبيق السعر على جميع الغرف دفعة واحدة' },
  rateAppliedSuccess: { en: 'Hourly rate updated for all rooms.', ar: 'تم تحديث سعر الساعة لجميع الغرف.' },
  saveSuccess: { en: 'Settings saved successfully!', ar: 'تم حفظ الإعدادات بنجاح!' }
};

interface TranslationContextType {
  t: (key: string) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
  isRtl: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language from settings repository
  useEffect(() => {
    const loadLang = async () => {
      try {
        const settings = await SettingRepository.getSettings();
        if (settings && settings.language) {
          setLanguageState(settings.language);
        }
      } catch (err) {
        console.error('Failed to load settings language', err);
      }
    };
    loadLang();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      const settings = await SettingRepository.getSettings();
      settings.language = lang;
      await SettingRepository.saveSettings(settings);
    } catch (err) {
      console.error('Failed to save language setting', err);
    }
  };

  const isRtl = language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRtl]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      return key;
    }
    return translation[language] || key;
  };

  return (
    <TranslationContext.Provider value={{ t, language, setLanguage, isRtl }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
