import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6",
        className
      )}
    >
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  );
}
