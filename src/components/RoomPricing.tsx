import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { useRole } from '../context/RoleContext';
import { useTranslation } from '../context/TranslationContext';
import type { Room } from '../types';

const RateRow: React.FC<{room: Room}> = ({room}) => {
  const { updateRoomRate, settings } = usePOS();
  const { language } = useTranslation();
  const ar = language === 'ar';
  const [rate, setRate] = useState(String(room.hourlyRate));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => { setRate(String(room.hourlyRate)); }, [room.hourlyRate]);
  return <form className="grid grid-cols-[minmax(0,1fr)_minmax(100px,1fr)_auto] gap-2 items-center border-t border-zinc-800 py-3" onSubmit={async e=>{
    e.preventDefault(); if(busy) return; setBusy(true); setStatus('');
    try { await updateRoomRate(room.id, Number(rate)); setStatus(ar?'تم الحفظ':'Saved'); }
    catch { setStatus(ar?'تعذر الحفظ. تحقق من السعر.':'Unable to save. Check rate.'); }
    finally { setBusy(false); }
  }}>
    <label htmlFor={'rate-'+room.id} className="text-sm text-white">{room.name} <span className="text-xs text-zinc-400">({room.category})</span></label>
    <div className="flex items-center gap-1"><input id={'rate-'+room.id} type="number" min="0" max="1000000000" step="0.01" required className="w-full min-w-0 rounded-lg bg-zinc-950 border border-zinc-700 text-white p-2" value={rate} onChange={e=>{setRate(e.target.value);setStatus('');}}/><span className="text-xs text-zinc-400">{settings.currency}</span></div>
    <button disabled={busy || rate.trim()==='' || Number(rate)===room.hourlyRate} className="rounded-lg bg-purple-600 text-white px-3 py-2 text-xs font-bold disabled:opacity-40">{ar?'حفظ':'Save'}</button>
    {status && <p className="col-span-3 text-xs text-zinc-300" role="status">{status}</p>}
  </form>;
};

export const RoomPricing: React.FC = () => {
  const { rooms } = usePOS();
  const { role } = useRole();
  const { language } = useTranslation();
  if(role!=='admin') return null;
  const ar = language==='ar';
  return <section className="glass-panel rounded-2xl border border-zinc-800 p-5 space-y-2">
    <h3 className="text-sm font-bold text-white">{ar?'تسعير كل غرفة على حدة':'Individual room pricing'}</h3>
    <p className="text-xs text-zinc-400">{ar?'حدد سعر الساعة لكل غرفة. السعر الجديد يطبق على الجلسات الجديدة فقط.':'Set each room’s hourly rate. Changes apply to new sessions only.'}</p>
    {rooms.map(room=><RateRow key={room.id} room={room}/>)}
  </section>;
};
