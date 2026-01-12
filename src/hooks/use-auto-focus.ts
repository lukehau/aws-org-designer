import { useEffect, useRef } from 'react';

/**
 * Hook to auto-focus input elements when component mounts
 * Works for all devices to improve accessibility and user experience
 */
export const useAutoFocus = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (ref.current) {
      // Small delay to ensure dialog is fully rendered
      const timer = setTimeout(() => {
        ref.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []);

  return ref;
};