/**
 * Safe localStorage wrapper with error handling
 * Handles cases where localStorage is unavailable (private browsing, etc.)
 */

const STORAGE_PREFIX = 'qurse_';

export type StorageKey =
  | 'guest_nudge_last_shown'
  | 'guest_nudge_session_count'
  | 'guest_nudge_lifetime_count'
  | 'guest_nudge_last_dismissed'
  | 'guest_nudge_session_id';

/**
 * Safely get item from localStorage
 */
export function safeGet<T>(key: StorageKey, defaultValue: T): T {
  try {
    if (typeof window === 'undefined') return defaultValue;

    const item = localStorage.getItem(STORAGE_PREFIX + key);
    if (item === null) return defaultValue;

    return JSON.parse(item) as T;
  } catch (error) {
    // localStorage unavailable or corrupted
    return defaultValue;
  }
}

/**
 * Safely set item in localStorage
 */
export function safeSet<T>(key: StorageKey, value: T): boolean {
  try {
    if (typeof window === 'undefined') return false;

    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch (error) {
    // localStorage unavailable or quota exceeded
    return false;
  }
}

/**
 * Safely remove item from localStorage
 */
export function safeRemove(key: StorageKey): boolean {
  try {
    if (typeof window === 'undefined') return false;

    localStorage.removeItem(STORAGE_PREFIX + key);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear all Qurse localStorage items
 */
export function clearAll(): boolean {
  try {
    if (typeof window === 'undefined') return false;

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    return false;
  }
}
