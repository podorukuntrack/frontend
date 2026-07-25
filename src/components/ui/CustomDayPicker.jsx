import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, X } from 'lucide-react';

export default function CustomDayPicker({ selectedDates = [], onChange, placeholder = "Pilih tanggal...", disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

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
    <>
      <div className="relative w-full">
        <div 
          className={`input w-full pl-10 pr-10 cursor-pointer flex items-center min-h-[42px] ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-900'}`}
          onClick={() => !disabled && setIsOpen(true)}
        >
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5" />
          <span className={`text-sm ${selectedDates.length === 0 ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'} truncate`}>
            {displayValue}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 absolute right-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-white">Pilih Tanggal</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
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
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
