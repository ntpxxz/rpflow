import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine multiple class names and automatically merge Tailwind classes.
 * Example: cn("p-2", condition && "bg-blue-500")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date into readable form (e.g., "2025-10-17" → "17 Oct 2025")
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Calculate total price for a purchase request.
 * Example: calcTotal(3, 150) → 450
 */
export function calcTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

/**
 * Capitalize first letter of any string.
 */
export function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
