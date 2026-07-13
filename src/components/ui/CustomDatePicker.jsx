import React from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import id from "date-fns/locale/id";
import { Calendar } from 'lucide-react';
import './CustomDatePicker.css'; // Import custom styles

export default function CustomDatePicker({ value, onChange, disabled, placeholder, showTimeSelect, dateFormat, ...props }) {
  let selectedDate = null;
  if (value) {
    if (showTimeSelect) {
      selectedDate = new Date(value);
    } else {
      const parts = value.split('-');
      if (parts.length >= 3) {
        selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        selectedDate = new Date(value);
      }
    }
  }

  return (
    <div className="relative w-full custom-datepicker-container">
      <DatePicker
        selected={selectedDate}
        onChange={(date) => {
          if (date) {
            if (showTimeSelect) {
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              const hh = String(date.getHours()).padStart(2, '0');
              const min = String(date.getMinutes()).padStart(2, '0');
              onChange(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
            } else {
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              onChange(`${yyyy}-${mm}-${dd}`);
            }
          } else {
            onChange("");
          }
        }}
        disabled={disabled}
        placeholderText={placeholder || (showTimeSelect ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY")}
        dateFormat={dateFormat || (showTimeSelect ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy")}
        showTimeSelect={showTimeSelect}
        timeFormat="HH:mm"
        locale={id}
        portalId="root-portal"
        className="input w-full pl-10 cursor-pointer disabled:cursor-not-allowed"
        wrapperClassName="w-full"
        {...props}
      />
      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}
