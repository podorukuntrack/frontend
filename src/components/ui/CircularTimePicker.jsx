import React, { useState, useEffect, useRef } from 'react';

export default function CircularTimePicker({ initialHour = 0, initialMinute = 0, onTimeChange, mode = 'hour', onModeChange }) {
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [isDragging, setIsDragging] = useState(false);
  const clockRef = useRef(null);

  useEffect(() => {
    setHour(initialHour);
    setMinute(initialMinute);
  }, [initialHour, initialMinute]);

  const getHandStyle = (value, isMinute) => {
    let angle = 0;
    let length = 100;
    if (isMinute) {
      angle = (value / 60) * 360 - 90;
    } else {
      angle = (value % 12) * 30 - 90;
      length = (value >= 1 && value <= 12) ? 100 : 65; 
    }
    return {
      transform: `rotate(${angle}deg)`,
      height: '2px',
      width: `${length}px`,
      transformOrigin: '0% 50%'
    };
  };

  const getNumberPosition = (index, total, radius) => {
    const angle = ((index / total) * 360 - 90) * (Math.PI / 180);
    return {
      left: `calc(50% + ${Math.cos(angle) * radius}px)`,
      top: `calc(50% + ${Math.sin(angle) * radius}px)`,
    };
  };

  const handleClockInteract = (clientX, clientY) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    const distance = Math.sqrt(x*x + y*y);

    if (mode === 'hour') {
      let selectedHour = Math.round(angle / 30) % 12;
      const isInner = distance < 80;
      if (selectedHour === 0) selectedHour = 12;
      if (isInner) {
         if (selectedHour === 12) selectedHour = 0;
         else selectedHour += 12;
      }
      setHour(selectedHour);
      onTimeChange && onTimeChange(selectedHour, minute);
    } else {
      let selectedMinute = Math.round(angle / 6) % 60;
      setMinute(selectedMinute);
      onTimeChange && onTimeChange(hour, selectedMinute);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleClockInteract(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      handleClockInteract(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      if (mode === 'hour') {
        setTimeout(() => onModeChange && onModeChange('minute'), 300);
      }
    }
  };

  const handleTouchStart = (e) => {
    // touch-none class handles scroll prevention, but we can also preventDefault if needed
    setIsDragging(true);
    const touch = e.touches[0];
    handleClockInteract(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e) => {
    if (isDragging) {
      const touch = e.touches[0];
      handleClockInteract(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      if (mode === 'hour') {
        setTimeout(() => onModeChange && onModeChange('minute'), 300);
      }
    }
  };

  const renderHours = () => {
    const hoursOuter = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const hoursInner = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    return (
      <>
        {hoursOuter.map((h, i) => (
          <div key={`ho-${h}`} className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-sm cursor-pointer select-none transition-colors ${hour === h ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`} style={getNumberPosition(i, 12, 100)}>
            {h}
          </div>
        ))}
        {hoursInner.map((h, i) => (
          <div key={`hi-${h}`} className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-sm cursor-pointer select-none transition-colors ${hour === h ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`} style={getNumberPosition(i, 12, 65)}>
            {h === 0 ? '00' : h}
          </div>
        ))}
      </>
    );
  };

  const renderMinutes = () => {
    const minutes = Array.from({length: 12}, (_, i) => i * 5);
    return minutes.map((m, i) => (
      <div key={`m-${m}`} className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-sm cursor-pointer select-none transition-colors ${minute === m ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`} style={getNumberPosition(i, 12, 100)}>
        {String(m).padStart(2, '0')}
      </div>
    ));
  };

  return (
    <div className="flex flex-col items-center p-4">
      <div className="flex gap-2 text-4xl font-light mb-8 text-slate-800 dark:text-slate-100 tracking-wider">
        <span 
          className={`cursor-pointer px-3 py-2 rounded-xl transition-all ${mode === 'hour' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-normal' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          onClick={() => onModeChange && onModeChange('hour')}
        >
          {String(hour).padStart(2, '0')}
        </span>
        <span className="py-2 text-slate-400 opacity-50">:</span>
        <span 
          className={`cursor-pointer px-3 py-2 rounded-xl transition-all ${mode === 'minute' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-normal' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          onClick={() => onModeChange && onModeChange('minute')}
        >
          {String(minute).padStart(2, '0')}
        </span>
      </div>

      <div 
        ref={clockRef}
        className="relative w-[260px] h-[260px] rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center cursor-pointer touch-none shadow-inner"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute w-2 h-2 rounded-full bg-indigo-600 z-10" />
        
        <div 
          className={`absolute left-1/2 top-1/2 bg-indigo-500 origin-left pointer-events-none ${!isDragging ? 'transition-transform duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]' : ''}`}
          style={getHandStyle(mode === 'hour' ? hour : minute, mode === 'minute')}
        >
          <div className="absolute -right-3 -top-[11px] w-6 h-6 rounded-full border-[6px] border-indigo-500 bg-transparent" />
        </div>

        {mode === 'hour' ? renderHours() : renderMinutes()}
      </div>
    </div>
  );
}
