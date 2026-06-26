import React from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import id from "date-fns/locale/id";
import { Calendar } from 'lucide-react';
import './CustomDatePicker.css'; // Import custom styles

export default function CustomDatePicker({ value, onChange, disabled, placeholder }) {
  let selectedDate = null;
  if (value) {
    const [year, month, day] = value.split('-');
    selectedDate = new Date(year, month - 1, day);
  }

  return (
    <div className="relative w-full custom-datepicker-container">
      <DatePicker
        selected={selectedDate}
        onChange={(date) => {
          if (date) {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            onChange(`${yyyy}-${mm}-${dd}`);
          } else {
            onChange("");
          }
        }}
        disabled={disabled}
        placeholderText={placeholder || "DD/MM/YYYY"}
        dateFormat="dd/MM/yyyy"
        locale={id}
        portalId="root-portal"
        className="w-full bg-transparent px-4 py-2.5 pl-10 text-sm text-slate-900 dark:text-white outline-none cursor-pointer placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:cursor-not-allowed disabled:text-slate-500 border border-transparent"
        wrapperClassName="w-full"
      />
      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}
