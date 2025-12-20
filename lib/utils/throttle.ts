'use client';

import { useRef, useCallback, useState, useEffect } from 'react';

/**
 * Throttle hook for React components
 * Ensures function is called at most once per delay period
 * 
 * @param callback - Function to throttle
 * @param delay - Throttle delay in milliseconds
 * @returns Throttled function
 */
export function useThrottle<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      if (timeSinceLastRun >= delay) {
        lastRun.current = now;
        callback(...args);
      } else {
        // Clear existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Schedule execution for remaining time
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now();
          callback(...args);
          timeoutRef.current = null;
        }, delay - timeSinceLastRun);
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Throttle a value update
 * Returns the latest value, but only updates at most once per delay period
 * 
 * @param value - Value to throttle
 * @param delay - Throttle delay in milliseconds
 * @returns Throttled value
 */
export function useThrottledValue<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdate = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any pending timeout when delay changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Early return for no throttling (delay <= 0)
    if (delay <= 0) {
      setThrottledValue(value);
      lastUpdate.current = Date.now();
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdate.current;
    let timeout: NodeJS.Timeout | null = null;

    if (timeSinceLastUpdate >= delay) {
      setThrottledValue(value);
      lastUpdate.current = now;
    } else {
      timeout = setTimeout(() => {
        setThrottledValue(value);
        lastUpdate.current = Date.now();
        timeoutRef.current = null;
      }, delay - timeSinceLastUpdate);
      timeoutRef.current = timeout;
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, delay]);

  // Return value directly if no throttling, otherwise return throttled value
  return delay <= 0 ? value : throttledValue;
}

