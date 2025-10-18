import { ReactNode, MouseEventHandler } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({ children, onClick, type = 'button' }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
    >
      {children}
    </button>
  );
}
