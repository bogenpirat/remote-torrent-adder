import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function moveToFront(value: string, options: string[]): string[] {
  return value ? [value, ...options.filter(option => option !== value)] : options;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
