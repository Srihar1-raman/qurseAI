/**
 * Format reset time as readable date/time
 */
export function formatResetTime(reset: number): string {
  const resetDate = new Date(reset);
  const now = new Date();
  const isToday = resetDate.toDateString() === now.toDateString();
  
  if (isToday) {
    return resetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return resetDate.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

/**
 * Get theme-aware background style for popup
 */
export function getPopupBackgroundStyle(resolvedTheme: 'light' | 'dark'): string {
  return resolvedTheme === 'dark' 
    ? 'rgba(26, 26, 26, 0.9)' 
    : 'rgba(255, 255, 255, 0.9)';
}

