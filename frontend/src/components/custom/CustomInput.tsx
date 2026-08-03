"use client";

import type { FC, InputHTMLAttributes } from 'react';

interface CustomInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const CustomInput: FC<CustomInputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
      <input
        className={`w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition ${className}`}
        {...props}
      />
    </div>
  );
};

export default CustomInput;
