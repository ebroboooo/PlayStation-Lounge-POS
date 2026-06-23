import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { useTranslation } from '../context/TranslationContext';
import { useRole } from '../context/RoleContext';
import { InventoryItem, ItemCategory } from '../types';
import { Plus, Edit3, Trash2, Star, ArrowUp, ArrowDown, Search, X, AlertTriangle } from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { inventory, saveInventoryItem, deleteInventoryItem } = usePOS();
  const { t, language } = useTranslation();
  const { role, canChangePricing, canDelete } = useRole();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals / Editors
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Item State Form
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    nameEnglish: '',
    nameArabic: '',
    category: 'Cold Drinks',
    costPrice: 0,
    sellingPrice: 0,
    stockQuantity: 50,
    lowStockThreshold: 10,
    favoriteItem: false
  });

  const categories: ItemCategory[] = ['Snacks', 'Bar', 'Hot Drinks', 'Cold Drinks'];

  // Filtered inventory list
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.nameEnglish.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameArabic.includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `inv-${Date.now()}`;
    // Assign order to end if favorite
    const order = newItem.favoriteItem ? inventory.filter(i => i.favoriteItem).length : 99;
    
    const itemToSave: InventoryItem = {
      id,
      nameEnglish: newItem.nameEnglish || '',
      nameArabic: newItem.nameArabic || '',
      category: newItem.category || 'Cold Drinks',
      costPrice: newItem.costPrice || 0,
      sellingPrice: newItem.sellingPrice || 0,
      stockQuantity: newItem.stockQuantity || 0,
      lowStockThreshold: newItem.lowStockThreshold || 0,
      favoriteItem: newItem.favoriteItem || false,
      favoriteOrder: order
    };

    await saveInventoryItem(itemToSave);
    setShowAddForm(false);
    
    // Reset form
    setNewItem({
      nameEnglish: '',
      nameArabic: '',
      category: 'Cold Drinks',
      costPrice: 0,
      sellingPrice: 0,
      stockQuantity: 50,
      lowStockThreshold: 10,
      favoriteItem: false
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await saveInventoryItem(editingItem);
    setEditingItem(null);
  };

  // Toggle favorite trigger
  const handleToggleFavorite = async (item: InventoryItem) => {
    const isFav = !item.favoriteItem;
    const favCount = inventory.filter(i => i.favoriteItem).length;
    const updated = {
      ...item,
      favoriteItem: isFav,
      favoriteOrder: isFav ? favCount : 99
    };
    await saveInventoryItem(updated);
  };

  // Reorder favorite items up and down
  const moveFavorite = async (item: InventoryItem, direction: 'up' | 'down') => {
    const favorites = inventory.filter(i => i.favoriteItem);
    const idx = favorites.findIndex(f => f.id === item.id);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= favorites.length) return;

    const otherItem = favorites[swapIdx];

    // Swap ordering index
    const tempOrder = item.favoriteOrder;
    item.favoriteOrder = otherItem.favoriteOrder;
    otherItem.favoriteOrder = tempOrder;

    await saveInventoryItem(item);
    await saveInventoryItem(otherItem);
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-white leading-tight">{t('inventory')}</h2>
          <p className="text-xs text-zinc-400">Add, edit, delete and rank lounge snacks and drinks.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>{t('addInventoryItem')}</span>
        </button>
      </div>

      {/* Query Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4.5 w-4.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchItems')}
            className="w-full rounded-xl bg-zinc-950 pl-10 pr-4 py-2.5 text-xs text-white border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-purple-500 font-semibold"
          />
        </div>
        
        {/* Category selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold cursor-pointer transition-colors ${
              selectedCategory === 'all' 
                ? 'bg-zinc-800 text-white' 
                : 'bg-zinc-950 text-zinc-400 border border-zinc-850 hover:bg-zinc-900'
            }`}
          >
            {t('allCategories')}
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold cursor-pointer transition-colors ${
                selectedCategory === cat 
                  ? 'bg-zinc-800 text-white' 
                  : 'bg-zinc-950 text-zinc-400 border border-zinc-850 hover:bg-zinc-900'
              }`}
            >
              {t(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table Grid */}
      <div className="glass-panel rounded-2xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-left text-xs font-semibold">
          <thead>
            <tr className="border-b border-zinc-850 bg-zinc-900/40 text-zinc-400 uppercase tracking-wider">
              <th className="p-4">{language === 'ar' ? 'الاسم' : 'Name'}</th>
              <th className="p-4">{t('roomCategory')}</th>
              <th className="p-4 font-mono">{t('costPrice')}</th>
              <th className="p-4 font-mono">{t('sellingPrice')}</th>
              <th className="p-4 font-mono">{t('stockQuantity')}</th>
              <th className="p-4 text-center">{t('favoriteItem')}</th>
              <th className="p-4 text-right">{language === 'ar' ? 'الخيارات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map(item => {
              const isLowStock = item.stockQuantity <= item.lowStockThreshold;
              return (
                <tr key={item.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/20 last:border-b-0">
                  
                  {/* Name (EN + AR) */}
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-white text-sm font-bold">{item.nameEnglish}</span>
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.nameArabic}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="p-4">
                    <span className="rounded-full bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-400">
                      {t(item.category)}
                    </span>
                  </td>

                  {/* Cost Price */}
                  <td className="p-4 font-mono text-zinc-300">
                    ${item.costPrice.toFixed(2)}
                  </td>

                  {/* Selling Price */}
                  <td className="p-4 font-mono text-purple-400">
                    ${item.sellingPrice.toFixed(2)}
                  </td>

                  {/* Stock Quantity */}
                  <td className="p-4 font-mono">
                    <div className="flex items-center gap-2">
                      <span className={isLowStock ? 'text-rose-500 font-bold' : 'text-zinc-300'}>
                        {item.stockQuantity}
                      </span>
                      {isLowStock && (
                        <span className="flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 text-[9px] text-rose-500">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{t('lowStock')}</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Favorite Toggle + Order control */}
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleToggleFavorite(item)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          item.favoriteItem 
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' 
                            : 'border-zinc-850 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <Star className="h-4 w-4 fill-current" />
                      </button>
                      
                      {item.favoriteItem && (
                        <div className="flex flex-col gap-0.5 no-print">
                          <button
                            onClick={() => moveFavorite(item, 'up')}
                            className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 cursor-pointer"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => moveFavorite(item, 'down')}
                            className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400 cursor-pointer"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="rounded-lg border border-zinc-850 bg-zinc-950 p-1.5 text-zinc-400 hover:text-white cursor-pointer hover:border-zinc-700 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => canDelete && deleteInventoryItem(item.id)}
                        disabled={!canDelete}
                        className="rounded-lg border border-zinc-850 bg-zinc-950 p-1.5 text-zinc-500 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed hover:border-rose-500/20 cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <form 
            onSubmit={handleAddSubmit}
            className="glass-panel w-full max-w-md rounded-2xl border border-zinc-700 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
              <h3 className="text-md font-bold text-white">{t('addInventoryItem')}</h3>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-zinc-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('nameEnglish')}</label>
                <input
                  type="text"
                  required
                  value={newItem.nameEnglish}
                  onChange={(e) => setNewItem({ ...newItem, nameEnglish: e.target.value })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('nameArabic')}</label>
                <input
                  type="text"
                  required
                  value={newItem.nameArabic}
                  onChange={(e) => setNewItem({ ...newItem, nameArabic: e.target.value })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('roomCategory')}</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value as ItemCategory })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {categories.map(c => <option key={c} value={c}>{t(c)}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={newItem.favoriteItem}
                    onChange={(e) => setNewItem({ ...newItem, favoriteItem: e.target.checked })}
                    className="h-4 w-4 rounded bg-zinc-950 border-zinc-850 text-purple-600 focus:ring-0"
                  />
                  <span>{t('favoriteItem')}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('costPrice')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newItem.costPrice || ''}
                  onChange={(e) => setNewItem({ ...newItem, costPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('sellingPrice')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newItem.sellingPrice || ''}
                  onChange={(e) => setNewItem({ ...newItem, sellingPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('stockQuantity')}</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newItem.stockQuantity}
                  onChange={(e) => setNewItem({ ...newItem, stockQuantity: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('lowStockThreshold')}</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newItem.lowStockThreshold}
                  onChange={(e) => setNewItem({ ...newItem, lowStockThreshold: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <form 
            onSubmit={handleEditSubmit}
            className="glass-panel w-full max-w-md rounded-2xl border border-zinc-700 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
              <h3 className="text-md font-bold text-white">{t('editInventoryItem')}: {editingItem.nameEnglish}</h3>
              <button type="button" onClick={() => setEditingItem(null)} className="text-zinc-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('nameEnglish')}</label>
                <input
                  type="text"
                  required
                  value={editingItem.nameEnglish}
                  onChange={(e) => setEditingItem({ ...editingItem, nameEnglish: e.target.value })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('nameArabic')}</label>
                <input
                  type="text"
                  required
                  value={editingItem.nameArabic}
                  onChange={(e) => setEditingItem({ ...editingItem, nameArabic: e.target.value })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('roomCategory')}</label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as ItemCategory })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 focus:outline-none"
                >
                  {categories.map(c => <option key={c} value={c}>{t(c)}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 select-none">
                  <input
                    type="checkbox"
                    checked={editingItem.favoriteItem}
                    onChange={(e) => setEditingItem({ ...editingItem, favoriteItem: e.target.checked })}
                    className="h-4 w-4 rounded bg-zinc-950 border-zinc-850 text-purple-600 focus:ring-0"
                  />
                  <span>{t('favoriteItem')}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('costPrice')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  disabled={!canChangePricing}
                  value={editingItem.costPrice || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, costPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 font-mono disabled:opacity-50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('sellingPrice')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  disabled={!canChangePricing}
                  value={editingItem.sellingPrice || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, sellingPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 font-mono disabled:opacity-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('stockQuantity')}</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editingItem.stockQuantity}
                  onChange={(e) => setEditingItem({ ...editingItem, stockQuantity: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-400">{t('lowStockThreshold')}</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editingItem.lowStockThreshold}
                  onChange={(e) => setEditingItem({ ...editingItem, lowStockThreshold: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs text-white border border-zinc-850 font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
