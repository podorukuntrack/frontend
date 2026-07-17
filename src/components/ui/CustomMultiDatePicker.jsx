import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import id from "date-fns/locale/id";
import { Calendar } from 'lucide-react';
import './CustomDatePicker.css'; // Reuse styles from CustomDatePicker

export default function CustomMultiDatePicker({ selectedDates, onChange, disabled, placeholder, minDate, maxDate, ...props }) {
  // Convert strings to Date objects for the picker
  const parsedDates = (selectedDates || []).map(d => {
    const parts = d.split('-');
    if (parts.length >= 3) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date(d);
  });

  return (
    <div className="relative w-full custom-datepicker-container">
      <DatePicker
        selectedDates={parsedDates}
        onChange={(dates) => {
          if (!dates) {
            onChange([]);
            return;
          }
          // dates is an array of Date objects
          const formattedDates = dates.map(date => {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
          });
          onChange(formattedDates);
        }}
        selectsMultiple
        shouldCloseOnSelect={false}
        disabled={disabled}
        placeholderText={placeholder || "Pilih beberapa tanggal..."}
        dateFormat="dd/MM/yyyy"
        minDate={minDate}
        maxDate={maxDate}
        locale={id}
        portalId="root-portal"
        className="input w-full pl-10 cursor-pointer disabled:cursor-not-allowed"
        wrapperClassName="w-full"
        fixedHeight
        {...props}
      />
      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}
