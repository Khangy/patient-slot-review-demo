import { Button, Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  /** ms; default 6000 */
  duration?: number;
}

type ToastFn = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ key: number; message: string; options?: ToastOptions } | null>(null);
  const show = useCallback<ToastFn>((message, options) => setToast({ key: Date.now(), message, options }), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <Snackbar
        key={toast?.key}
        open={!!toast}
        autoHideDuration={toast?.options?.duration ?? 6000}
        onClose={(_, reason) => reason !== 'clickaway' && setToast(null)}
        message={toast?.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        action={
          toast?.options?.actionLabel ? (
            <Button
              color="inherit"
              size="small"
              sx={{ fontWeight: 700 }}
              onClick={() => {
                toast.options?.onAction?.();
                setToast(null);
              }}
            >
              {toast.options.actionLabel}
            </Button>
          ) : undefined
        }
      />
    </ToastContext.Provider>
  );
}

/** toast('Accepted.', { actionLabel: 'Undo', onAction }) */
export const useToast = () => useContext(ToastContext);
