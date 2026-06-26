import React from 'react';
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { Calendar } from 'lucide-react';

export default function CustomDatePicker({ value, onChange, disabled, placeholder }) {
  return (
    <div className="relative w-full">
      <Flatpickr
        value={value}
        onChange={(dates) => {
          if (dates.length > 0) {
            // Convert to YYYY-MM-DD in local time
            const d = dates[0];
            const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            onChange(localDate);
          } else {
            onChange("");
          }
        }}
        options={{
          dateFormat: "d/m/Y",
          disableMobile: "true" 
        }}
        disabled={disabled}
        placeholder={placeholder || "DD/MM/YYYY"}
        className="w-full bg-transparent px-4 py-2.5 pl-10 text-sm text-slate-900 dark:text-white outline-none cursor-pointer placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:cursor-not-allowed disabled:text-slate-500"
      />
      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}
