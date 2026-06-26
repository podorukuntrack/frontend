import React, { useState, useEffect } from 'react';
import DatePicker from "react-datepicker";
import id from "date-fns/locale/id";
import { Modal } from './index'; // assuming Modal is exported from index
import CircularTimePicker from './CircularTimePicker';
import "react-datepicker/dist/react-datepicker.css";
import './CustomDatePicker.css';
import { Calendar, Clock } from 'lucide-react';

export default function DateTimePickerModal({ isOpen, onClose, onSave, initialValue }) {
  const [step, setStep] = useState('date'); // 'date' | 'time'
  const [timeMode, setTimeMode] = useState('hour'); // 'hour' | 'minute'
  const [selectedDate, setSelectedDate] = useState(null);
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (initialValue) {
        const d = new Date(initialValue);
        setSelectedDate(d);
        setHour(d.getHours());
        setMinute(d.getMinutes());
      } else {
        const now = new Date();
        setSelectedDate(now);
        setHour(now.getHours());
        setMinute(now.getMinutes());
      }
      setStep('date');
      setTimeMode('hour');
    }
  }, [isOpen, initialValue]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setStep('time');
    setTimeMode('hour');
  };

  const handleTimeChange = (h, m) => {
    setHour(h);
    setMinute(m);
  };

  const handleSave = () => {
    if (!selectedDate) return;
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const hh = String(hour).padStart(2, '0');
    const min = String(minute).padStart(2, '0');
    onSave(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pilih Tanggal & Waktu" size="sm">
      <div className="flex flex-col items-center">
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-full mb-6 mt-2">
          <button 
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${step === 'date' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setStep('date')}
          >
            <Calendar className="w-4 h-4" /> Tanggal
          </button>
          <button 
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${step === 'time' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50'}`}
            onClick={() => setStep('time')}
            disabled={!selectedDate}
          >
            <Clock className="w-4 h-4" /> Waktu
          </button>
        </div>

        {/* Content Area */}
        <div className="w-full flex justify-center min-h-[360px] items-start">
          {step === 'date' ? (
            <div className="custom-datepicker-container">
              <DatePicker
                selected={selectedDate}
                onChange={handleDateSelect}
                inline
                locale={id}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                fixedHeight
                calendarClassName="!border-0 !bg-transparent shadow-none"
              />
            </div>
          ) : (
            <CircularTimePicker 
              initialHour={hour}
              initialMinute={minute}
              mode={timeMode}
              onModeChange={setTimeMode}
              onTimeChange={handleTimeChange}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            type="button" 
            className="btn-secondary flex-1 !py-2.5 font-semibold" 
            onClick={onClose}
          >
            Batal
          </button>
          <button 
            type="button" 
            className="btn-primary flex-1 !py-2.5 font-semibold disabled:opacity-50" 
            onClick={handleSave}
            disabled={!selectedDate || (step === 'date')}
          >
            Simpan
          </button>
        </div>
      </div>
    </Modal>
  );
}
