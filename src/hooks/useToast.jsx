// File: src/hooks/useToast.js
import { useCallback } from 'react';

export function useToast() {
  const toast = useCallback((msg, type = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg, type } }));
  }, []);
  
  return { toast };
}