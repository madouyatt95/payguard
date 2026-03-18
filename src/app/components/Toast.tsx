'use client';
// ============================================================
// PayGuard — Toast Notification System
// ============================================================
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 10000,
        display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '380px',
      }}>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.4)', icon: '✅' },
  error: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.4)', icon: '❌' },
  warning: { bg: 'rgba(250, 204, 21, 0.12)', border: 'rgba(250, 204, 21, 0.4)', icon: '⚠️' },
  info: { bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.4)', icon: 'ℹ️' },
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const style = TOAST_STYLES[toast.type];

  return (
    <div
      style={{
        background: style.bg, border: `1px solid ${style.border}`,
        borderRadius: '12px', padding: '0.8rem 1rem', display: 'flex',
        alignItems: 'center', gap: '0.75rem', backdropFilter: 'blur(12px)',
        animation: 'slideInRight 0.3s ease-out',
        cursor: 'pointer',
      }}
      onClick={onClose}
    >
      <span style={{ fontSize: '1.1rem' }}>{style.icon}</span>
      <p style={{ margin: 0, fontSize: '0.9rem', flex: 1, color: 'var(--text-primary)' }}>{toast.message}</p>
      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', cursor: 'pointer' }}>✕</span>
    </div>
  );
}
