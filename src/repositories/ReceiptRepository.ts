import { Receipt } from '../types';
import { IndexedDBManager } from '../db/db';

export class ReceiptRepository {
  public static async getAll(): Promise<Receipt[]> {
    const receipts = await IndexedDBManager.getAll<Receipt>('receipts');
    // Sort receipts by timestamp descending by default (newest first)
    return receipts.sort((a, b) => b.timestamp - a.timestamp);
  }

  public static async getById(receiptNumber: string): Promise<Receipt | null> {
    return IndexedDBManager.get<Receipt>('receipts', receiptNumber);
  }

  public static async save(receipt: Receipt): Promise<void> {
    return IndexedDBManager.put('receipts', receipt);
  }

  public static async getNextReceiptNumber(): Promise<string> {
    const receipts = await this.getAll();
    const currentYear = new Date().getFullYear();
    const prefix = `V30-${currentYear}-`;

    const yearReceipts = receipts.filter(r => r.receiptNumber.startsWith(prefix));
    let nextIndex = 1;

    if (yearReceipts.length > 0) {
      const indices = yearReceipts.map(r => {
        const parts = r.receiptNumber.split('-');
        const indexStr = parts[parts.length - 1];
        return parseInt(indexStr, 10);
      });
      const maxIndex = Math.max(...indices);
      if (!isNaN(maxIndex)) {
        nextIndex = maxIndex + 1;
      }
    }

    // Format: V30-YYYY-000001
    const indexStr = String(nextIndex).padStart(6, '0');
    return `${prefix}${indexStr}`;
  }
}
