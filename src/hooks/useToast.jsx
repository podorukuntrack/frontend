// File: src/hooks/useToast.js
import { useCallback } from 'react';

export function useToast() {
  const toast = useCallback((msg, type = 'info', options = {}) => {
    const id = options.id || Date.now() + Math.random().toString();
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { id, msg, type, progress: options.progress } }));
    return id;
  }, []);
  
  return { toast };
}