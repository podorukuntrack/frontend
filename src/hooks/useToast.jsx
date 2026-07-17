// File: src/hooks/useToast.js
import { useCallback } from 'react';

/**
 * A custom hook to dispatch toast notifications via window events.
 * Listened to by ToastContainer in ui/index.jsx
 * @returns {{toast: (msg: string|{title: string, description: string}, type?: 'success'|'error'|'info', options?: {id?: string, progress?: number}) => string}}
 */
export function useToast() {
  const toast = useCallback((msg, type = 'info', options = {}) => {
    const id = options.id || Date.now() + Math.random().toString();
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { id, msg, type, progress: options.progress } }));
    return id;
  }, []);
  
  return { toast };
}