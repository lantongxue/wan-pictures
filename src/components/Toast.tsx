import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { ToastMessage } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  const { isDark } = useTheme();

  return (
    <div
      id="toast-container"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl shadow-2xl backdrop-blur-2xl border ${
                isDark
                  ? isSuccess
                    ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100'
                    : isError
                    ? 'bg-rose-950/90 border-rose-500/30 text-rose-100'
                    : isWarning
                    ? 'bg-amber-950/90 border-amber-500/30 text-amber-100'
                    : 'bg-[#080808]/95 border-white/15 text-white'
                  : isSuccess
                  ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950 shadow-emerald-500/10'
                  : isError
                  ? 'bg-rose-50/95 border-rose-300 text-rose-950 shadow-rose-500/10'
                  : isWarning
                  ? 'bg-amber-50/95 border-amber-300 text-amber-950 shadow-amber-500/10'
                  : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-900/10'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {isError && <XCircle className="w-5 h-5 text-rose-500" />}
                {isWarning && <AlertCircle className="w-5 h-5 text-amber-500" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-500" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-5">{toast.title}</p>
                {toast.description && (
                  <p className="text-[11px] opacity-80 mt-0.5 leading-4 break-words">{toast.description}</p>
                )}
              </div>

              <button
                id={`dismiss-toast-${toast.id}`}
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100 p-1 transition-opacity cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
