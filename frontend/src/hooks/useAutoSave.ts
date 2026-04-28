'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook for auto-saving form data to localStorage with debouncing.
 * Helps prevent data loss when session expires or tab crashes.
 */
export const useAutoSave = <T extends Record<string, any>>(
  key: string,
  data: T,
  interval: number = 5000, // Auto-save every 5 seconds
) => {
  const [lastSavedTime, setLastSavedTime] = useState<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef(data);

  // Update ref whenever data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Set up auto-save interval
  useEffect(() => {
    if (!key || !data) return;

    const saveToStorage = () => {
      try {
        const storageKey = `autosave_${key}`;
        const dataToSave = {
          data: dataRef.current,
          savedAt: new Date().toISOString(),
        };

        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        setLastSavedTime(Date.now());
      } catch (error) {
        // Silently fail - don't disrupt UX for storage errors
        console.warn('Failed to auto-save:', error);
      }
    };

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(saveToStorage, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, data, interval]);

  /**
   * Restore data from localStorage if it exists.
   */
  const restore = (): T | null => {
    try {
      const storageKey = `autosave_${key}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { data: restoredData, savedAt } = JSON.parse(saved);
        // Show notification that data was recovered
        const timeDiff = Date.now() - new Date(savedAt).getTime();
        const minutes = Math.floor(timeDiff / (1000 * 60));
        toast.info(
          minutes > 0
            ? `Recovered unsaved work from ${minutes}m ago`
            : 'Recovered unsaved work',
          { duration: 4000 },
        );
        return restoredData as T;
      }
    } catch (error) {
      console.warn('Failed to restore auto-saved data:', error);
    }
    return null;
  };

  /**
   * Clear auto-saved data (call after successful save).
   */
  const clear = () => {
    try {
      const storageKey = `autosave_${key}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear auto-save:', error);
    }
  };

  return {
    lastSavedTime,
    restore,
    clear,
  };
};
