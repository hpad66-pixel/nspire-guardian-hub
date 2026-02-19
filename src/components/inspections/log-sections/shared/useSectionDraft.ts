import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';

/**
 * Persists and restores section state to/from localStorage.
 * Debounces writes by 2 seconds.
 */
export function useSectionDraft<T>(
  sectionKey: string,
  propertyId: string,
  initialState: T
) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const storageKey = `daily_log_${propertyId}_${today}_${sectionKey}`;

  const [state, setStateRaw] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved) as T;
    } catch {}
    return initialState;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (val: T) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(val));
      } catch {}
    },
    [storageKey]
  );

  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setStateRaw((prev) => {
        const next = typeof updater === 'function'
          ? (updater as (p: T) => T)(prev)
          : updater;

        // Debounce persist
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => persist(next), 2000);

        return next;
      });
    },
    [persist]
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setStateRaw(initialState);
  }, [storageKey, initialState]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { state, setState, clear };
}
