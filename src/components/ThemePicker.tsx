import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';

const KEY = 'loungelink-appearance';
const themes = [
  { id: 'graphite', en: 'Graphite', ar: 'رمادي داكن' },
  { id: 'midnight', en: 'Midnight blue', ar: 'أزرق ليلي' },
  { id: 'slate', en: 'Soft slate', ar: 'رمادي هادئ' },
  { id: 'warm', en: 'Warm evening', ar: 'مساء دافئ' }
] as const;
type Theme = typeof themes[number]['id'];
function getTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    return themes.some(t => t.id === value) ? value as Theme : 'graphite';
  } catch { return 'graphite'; }
}
export function ThemePicker() {
  const { language } = useTranslation();
  const [theme, setTheme] = useState<Theme>(getTheme);
  useEffect(() => {
    document.documentElement.dataset.appearance = theme;
    try { localStorage.setItem(KEY, theme); } catch { /* appearance works for this session */ }
  }, [theme]);
  return <label className="flex items-center gap-1.5 text-xs text-zinc-300">
    <Palette className="h-4 w-4 text-purple-400" aria-hidden="true"/>
    <select aria-label={language === 'ar' ? 'مظهر الواجهة' : 'Appearance theme'} value={theme} onChange={e => setTheme(e.target.value as Theme)} className="max-w-[136px] rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white focus:ring-2 focus:ring-purple-500">
      {themes.map(t => <option key={t.id} value={t.id}>{language === 'ar' ? t.ar : t.en}</option>)}
    </select>
  </label>;
}
