import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, ...props }: InputProps) {
  return (
    <div className="flex flex-col space-y-1">
      {label && <label className="font-medium">{label}</label>}
      <input
        className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        {...props}
      />
    </div>
  );
}
