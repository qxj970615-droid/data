import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  parseISO,
  isWithinInterval,
  startOfDay
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MapPin, 
  Briefcase, 
  Waves, 
  Zap, 
  Trees, 
  Building2,
  X,
  Calendar as CalendarIcon,
  Trash2,
  Menu,
  Settings2,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types & Constants ---

type Slot = 'AM' | 'PM';

type EventType = 'business' | 'diving' | 'running' | 'hiking' | 'city' | 'other';

interface TravelRecord {
  id: string;
  type: EventType;
  location: string;
  notes: string;
  startDate: string; // ISO Date String
  startSlot: Slot;
  endDate: string; // ISO Date String
  endSlot: Slot;
  createdAt: number;
}

const DEFAULT_EVENT_TYPES: { id: string; label: string; color: string }[] = [
  { id: 'business', label: '出差', color: '#3B82F6' },
  { id: 'diving', label: '潜水', color: '#06B6D4' },
  { id: 'running', label: '越野跑', color: '#F43F5E' },
  { id: 'hiking', label: '徒步', color: '#10B981' },
  { id: 'city', label: '城市旅行', color: '#F59E0B' },
];

const PRESET_COLORS = [
  '#3B82F6', '#06B6D4', '#F43F5E', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F97316',
  '#64748B', '#000000'
];

export default function App() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<TravelRecord[]>([]);
  const [eventTypes, setEventTypes] = useState(DEFAULT_EVENT_TYPES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isThemesCollapsed, setIsThemesCollapsed] = useState(true);
  const [editingRecord, setEditingRecord] = useState<Partial<TravelRecord> | null>(null);
  const [newThemeLabel, setNewThemeLabel] = useState('');
  const [newThemeColor, setNewThemeColor] = useState(PRESET_COLORS[0]);

  // Load data from localStorage
  useEffect(() => {
    const savedRecords = localStorage.getItem('travel_records');
    const savedThemes = localStorage.getItem('travel_themes');
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedThemes) setEventTypes(JSON.parse(savedThemes));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('travel_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('travel_themes', JSON.stringify(eventTypes));
  }, [eventTypes]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleAddClick = (date: Date) => {
    const iso = format(date, 'yyyy-MM-dd');
    setEditingRecord({
      type: eventTypes[0]?.id as EventType || 'other',
      location: '',
      notes: '',
      startDate: iso,
      startSlot: 'AM',
      endDate: iso,
      endSlot: 'PM',
    });
    setIsModalOpen(true);
  };

  const handleSaveRecord = () => {
    if (!editingRecord?.location || !editingRecord?.startDate || !editingRecord?.endDate) return;

    const newRecord: TravelRecord = {
      id: editingRecord.id || Math.random().toString(36).substr(2, 9),
      type: editingRecord.type || 'other' as EventType,
      location: editingRecord.location,
      notes: editingRecord.notes || '',
      startDate: editingRecord.startDate,
      startSlot: editingRecord.startSlot || 'AM',
      endDate: editingRecord.endDate,
      endSlot: editingRecord.endSlot || 'PM',
      createdAt: Date.now(),
    } as TravelRecord;

    if (editingRecord.id) {
      setRecords(records.map(r => r.id === editingRecord.id ? newRecord : r));
    } else {
      setRecords([...records, newRecord]);
    }
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleDeleteRecord = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleAddTheme = () => {
    if (!newThemeLabel) return;
    const newTheme = {
      id: Math.random().toString(36).substr(2, 9),
      label: newThemeLabel,
      color: newThemeColor
    };
    setEventTypes([...eventTypes, newTheme]);
    setNewThemeLabel('');
  };

  const handleDeleteTheme = (id: string) => {
    setEventTypes(eventTypes.filter(t => t.id !== id));
  };

  // --- Calendar Logic ---
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getRecordForDay = (date: Date) => {
    const dayTimestamp = startOfDay(date).getTime();
    return records.filter(record => {
      const start = startOfDay(parseISO(record.startDate)).getTime();
      const end = startOfDay(parseISO(record.endDate)).getTime();
      return dayTimestamp >= start && dayTimestamp <= end;
    });
  };

  const monthlyRecords = useMemo(() => {
    return records.filter(record => {
      const start = parseISO(record.startDate);
      const end = parseISO(record.endDate);
      return isSameMonth(start, currentMonth) || isSameMonth(end, currentMonth);
    }).sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
  }, [records, currentMonth]);

  const totalTravelDays = useMemo(() => {
    const filledSlots = new Set<string>();
    const monthStart = startOfDay(startOfMonth(currentMonth)).getTime();
    const monthEnd = startOfDay(endOfMonth(currentMonth)).getTime();

    records.forEach(record => {
      const recStart = parseISO(record.startDate);
      const recEnd = parseISO(record.endDate);
      
      eachDayOfInterval({ 
        start: startOfDay(recStart), 
        end: startOfDay(recEnd) 
      }).forEach(day => {
        const time = startOfDay(day).getTime();
        if (time >= monthStart && time <= monthEnd) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isStartDay = isSameDay(day, recStart);
          const isEndDay = isSameDay(day, recEnd);

          const startS = record.startSlot;
          const endS = record.endSlot;

          let hasAM = true;
          let hasPM = true;
          
          if (isStartDay && startS === 'PM') hasAM = false;
          if (isEndDay && endS === 'AM') hasPM = false;
          
          if (hasAM) filledSlots.add(`${dateStr}-AM`);
          if (hasPM) filledSlots.add(`${dateStr}-PM`);
        }
      });
    });
    return filledSlots.size / 2;
  }, [records, currentMonth]);

  return (
    <div className="h-screen bg-[#F8F9FA] relative font-sans overflow-hidden">
      {/* Sidebar / Drawer Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 z-40 bg-slate-900/10 backdrop-blur-[2px]"
            />
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-[280px] bg-white z-50 border-r border-slate-100 p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-serif text-xl font-bold tracking-tight">旅迹设置</span>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 space-y-8 overflow-y-auto pr-2">
                {/* Theme Management Section */}
                <section className="space-y-4">
                  <button 
                    onClick={() => setIsThemesCollapsed(!isThemesCollapsed)}
                    className="w-full flex items-center justify-between text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Settings2 size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">主题管理</span>
                    </div>
                    {isThemesCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                  
                  <AnimatePresence>
                    {!isThemesCollapsed && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4"
                      >
                        <div className="flex flex-col gap-2">
                          {eventTypes.map(type => (
                            <div key={type.id} className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-50 transition-all border border-transparent hover:border-slate-200">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: type.color }} />
                                <span className="text-xs font-bold text-slate-700">{type.label}</span>
                              </div>
                              <button onClick={() => handleDeleteTheme(type.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          
                          <div className="mt-4 p-4 bg-slate-50 rounded-2xl space-y-3">
                            <input 
                              type="text" 
                              placeholder="新主题名称"
                              value={newThemeLabel}
                              onChange={e => setNewThemeLabel(e.target.value)}
                              className="w-full text-xs p-2.5 bg-white border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-100"
                            />
                            <div className="flex flex-wrap gap-1.5">
                              {PRESET_COLORS.map(c => (
                                <button 
                                  key={c}
                                  onClick={() => setNewThemeColor(c)}
                                  className={cn(
                                    "w-5 h-5 rounded-full border-2 transition-transform active:scale-90",
                                    newThemeColor === c ? "border-slate-900 scale-110" : "border-transparent"
                                  )}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <button 
                              onClick={handleAddTheme}
                              className="w-full text-[10px] font-bold bg-[#111] text-white py-2.5 rounded-lg active:scale-95 transition-all"
                            >
                              新增主题
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              </div>

              <div className="pt-6 border-t border-slate-100 text-center">
                <p className="text-[9px] font-bold text-slate-300 tracking-tighter uppercase">TravelLog © 2026</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="h-full flex flex-col p-4 md:p-8">
        {/* Compact Header for Calendar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all active:scale-90"
            >
              <Menu size={24} className="text-[#111]" />
            </button>
            <div className="flex items-baseline gap-3">
              <h1 className="font-serif text-4xl font-light text-[#111] tracking-tight">
                {format(currentMonth, 'M月', { locale: zhCN })}
              </h1>
              <span className="text-xl font-light text-slate-300">{format(currentMonth, 'yyyy')}</span>
            </div>
          </div>
          
          <div className="flex gap-2 p-1 bg-white border border-slate-100 rounded-xl shadow-sm">
            <button onClick={handlePrevMonth} className="px-3 py-1.5 hover:bg-slate-50 text-slate-400 font-bold transition-all active:scale-95 text-xs">
              上月
            </button>
            <div className="w-[1px] bg-slate-100 my-1" />
            <button onClick={handleNextMonth} className="px-3 py-1.5 hover:bg-slate-50 text-slate-400 font-bold transition-all active:scale-95 text-xs">
              下月
            </button>
          </div>
        </div>

        {/* Calendar Grid Header */}
        <div className="grid grid-cols-7 mb-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-[10px] uppercase font-black tracking-[0.2em] text-slate-300">
              {day}
            </div>
          ))}
        </div>

        {/* The Full Screen Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6 calendar-grid-border bg-white rounded-3xl overflow-hidden shadow-[0_8px_40px_-20px_rgba(0,0,0,0.1)]">
          {calendarDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const activeRecords = getRecordForDay(day);

            return (
              <div 
                key={day.toISOString()}
                onClick={() => handleAddClick(day)}
                className={cn(
                  "day-cell-border relative p-2 md:p-3 flex flex-col transition-all cursor-pointer group min-h-0",
                  !isCurrentMonth ? "bg-slate-50/20" : "hover:bg-slate-100/20"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-[10px] md:text-sm transition-colors",
                    isToday 
                      ? "text-blue-600 font-black" 
                      : isCurrentMonth 
                        ? "text-slate-900 font-semibold" 
                        : "text-slate-300 font-light opacity-60"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {isToday && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </div>

                <div className="flex-1 relative z-10 space-y-1 overflow-hidden">
                  {activeRecords.map(record => {
                    const typeInfo = eventTypes.find(t => t.id === record.type);
                    const isStart = isSameDay(day, parseISO(record.startDate));
                    const isEnd = isSameDay(day, parseISO(record.endDate));

                    return (
                      <div 
                        key={record.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRecord(record);
                          setIsModalOpen(true);
                        }}
                        className={cn(
                          "h-5 md:h-6 flex items-center px-2 md:px-3 text-[8px] md:text-[10px] font-bold text-white shadow-sm transition-all active:scale-[0.98]",
                          isStart && record.startSlot === 'AM' ? "rounded-l-full" : "",
                          isEnd && record.endSlot === 'PM' ? "rounded-r-full" : "",
                          isStart && record.startSlot === 'PM' ? "rounded-l-full ml-[50%]" : "",
                          isEnd && record.endSlot === 'AM' ? "rounded-r-full mr-[50%]" : "",
                        )}
                        style={{
                          backgroundColor: typeInfo?.color || '#64748B',
                          opacity: isCurrentMonth ? 1 : 0.2,
                        }}
                      >
                        {(isStart || (format(day, 'i') === '0')) && (
                          <span className="truncate filter drop-shadow-sm">{record.location}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Monthly Footprints Summary */}
        <section className="mt-10 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin size={16} />
              <span className="text-xs font-bold uppercase tracking-widest text-[#111]">本月足迹</span>
              <span className="text-xs text-slate-300 font-medium">— {monthlyRecords.length} 条记录</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">本月出行 {totalTravelDays} 天</span>
            </div>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {monthlyRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-300 italic">本月还没有行踪记录哦...</p>
              </div>
            ) : (
              monthlyRecords.map(record => {
                const typeInfo = eventTypes.find(t => t.id === record.type);
                return (
                  <motion.div 
                    key={record.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => {
                      setEditingRecord(record);
                      setIsModalOpen(true);
                    }}
                    className="min-w-[160px] md:min-w-[200px] flex flex-col p-4 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeInfo?.color }} />
                      <span className="text-[10px] font-bold text-slate-300">
                        {format(parseISO(record.startDate), 'MM/dd')}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#111] truncate mb-1">{record.location}</h3>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      {typeInfo?.label} · {format(parseISO(record.startDate), 'do', { locale: zhCN })} - {format(parseISO(record.endDate), 'do', { locale: zhCN })}
                    </p>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#111]/10 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-serif text-2xl font-medium tracking-tight">记录行程</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">行程类型</label>
                  <div className="flex flex-wrap gap-2">
                    {eventTypes.map(type => (
                      <button
                        key={type.id}
                        onClick={() => setEditingRecord({ ...editingRecord!, type: type.id as EventType })}
                        className={cn(
                          "px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all",
                          editingRecord?.type === type.id 
                            ? "bg-[#111] border-transparent text-white" 
                            : "bg-slate-50 border-slate-100 text-slate-500"
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">地点</label>
                  <input 
                    type="text" 
                    value={editingRecord?.location || ''}
                    onChange={e => setEditingRecord({ ...editingRecord!, location: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-slate-300 transition-all font-medium"
                    placeholder="去哪里？"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">出发</label>
                    <input 
                      type="date"
                      value={editingRecord?.startDate || ''}
                      onChange={e => setEditingRecord({ ...editingRecord!, startDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-mono"
                    />
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      {(['AM', 'PM'] as Slot[]).map(slot => (
                        <button
                          key={slot}
                          onClick={() => setEditingRecord({ ...editingRecord!, startSlot: slot })}
                          className={cn(
                            "flex-1 text-[9px] font-bold py-1 transition-all",
                            editingRecord?.startSlot === slot ? "bg-white text-[#111] rounded shadow-sm" : "text-slate-400"
                          )}
                        >
                          {slot === 'AM' ? '上午' : '下午'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">返回</label>
                    <input 
                      type="date"
                      value={editingRecord?.endDate || ''}
                      onChange={e => setEditingRecord({ ...editingRecord!, endDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-mono"
                    />
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      {(['AM', 'PM'] as Slot[]).map(slot => (
                        <button
                          key={slot}
                          onClick={() => setEditingRecord({ ...editingRecord!, endSlot: slot })}
                          className={cn(
                            "flex-1 text-[9px] font-bold py-1 transition-all",
                            editingRecord?.endSlot === slot ? "bg-white text-[#111] rounded shadow-sm" : "text-slate-400"
                          )}
                        >
                          {slot === 'AM' ? '上午' : '下午'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  {editingRecord?.id && (
                    <button 
                      onClick={() => handleDeleteRecord(editingRecord.id!)}
                      className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button 
                    onClick={handleSaveRecord}
                    className="flex-1 bg-[#111] text-white font-bold rounded-xl py-4 text-sm active:scale-95 transition-all shadow-xl shadow-slate-200"
                  >
                    保存更新
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
