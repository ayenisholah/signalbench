import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes, later wins. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Zero-pad a number for terminal-style counters: pad(3) → "03". */
export function pad(n: number, width = 2) {
  return String(n).padStart(width, "0");
}
