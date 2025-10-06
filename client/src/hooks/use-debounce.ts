import { useCallback, useRef } from 'react';

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): {
  debounced: (...args: Parameters<T>) => void;
  flush: (...overrideArgs: Parameters<T> | []) => void;
  cancel: () => void;
} {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const argsRef = useRef<Parameters<T> | null>(null);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    argsRef.current = null;
  }, []);

  const flush = useCallback((...overrideArgs: Parameters<T> | []) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Use override args if provided, otherwise use stored args
    const argsToUse = overrideArgs.length > 0 ? overrideArgs : argsRef.current;
    if (argsToUse) {
      callback(...(argsToUse as Parameters<T>));
      argsRef.current = null;
    }
  }, [callback]);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      argsRef.current = args;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        argsRef.current = null;
      }, delay);
    },
    [callback, delay]
  );

  return { debounced, flush, cancel };
}
