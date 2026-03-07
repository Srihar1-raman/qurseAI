import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * @param inputs - Array of class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFlightStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'en-route': '#10b981',
    'active': '#10b981',
    'landed': '#10b981',
    'delayed': '#f59e0b',
    'cancelled': '#ef4444',
    'diverted': '#ef4444',
    'scheduled': '#6b7280',
  };
  return colors[status.toLowerCase()] || colors.scheduled;
}

export function getFlightStatusGradient(status: string): string {
  const gradients: Record<string, string> = {
    'en-route': 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)',
    'active': 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)',
    'landed': 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)',
    'delayed': 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)',
    'cancelled': 'linear-gradient(135deg, #ef4444 0%, #f87171 50%, #fca5a5 100%)',
    'diverted': 'linear-gradient(135deg, #ef4444 0%, #f87171 50%, #fca5a5 100%)',
    'scheduled': 'linear-gradient(135deg, #6b7280 0%, #9ca3af 50%, #d1d5db 100%)',
  };
  return gradients[status.toLowerCase()] || gradients.scheduled;
}

export function getAltitude(meters: number): string {
  if (!meters || meters === 0) return 'N/A';
  const feet = Math.round(meters * 3.28084);
  return feet >= 1000 ? `${(feet / 1000).toFixed(1)}k ft` : `${feet} ft`;
}

export function getDirection(degrees: number): string {
  if (!degrees && degrees !== 0) return 'N/A';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(degrees / 45) % 8];
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes === 0) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function formatTime(date: string | Date): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDate(date: string | Date): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
