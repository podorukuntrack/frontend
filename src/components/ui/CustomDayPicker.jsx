import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export default function CustomDayPicker({ selectedDates = [], onChange, placeholder = "Pilih tanggal...", disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDay = (day) => {
    const isSelected = selectedDates.includes(day);
    let newDates;
    if (isSelected) {
      newDates = selectedDates.filter(d => d !== day);
    } else {
      newDates = [...selectedDates, day].sort((a, b) => a - b);
    }
    onChange(newDates);
  };

  const displayValue = selectedDates.length > 0 
    ? `Tgl: ${selectedDates.join(", ")}` 
    : placeholder;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className={`input w-full pl-10 pr-10 cursor-pointer flex items-center min-h-[42px] ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-900'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5" />
        <span className={`text-sm ${selectedDates.length === 0 ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'} truncate`}>
          {displayValue}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 absolute right-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] top-[calc(100%+4px)] left-0 w-full md:w-[320px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-4">
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
              const isSelected = selectedDates.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDay(day);
                  }}
                  className={`w-full aspect-square flex items-center justify-center rounded-lg text-xs font-semibold transition-all duration-200 ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-600 ring-offset-1 dark:ring-offset-slate-800' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/50'}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-center">
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              Tutup Kalender
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
