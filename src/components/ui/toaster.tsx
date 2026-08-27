import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useToast } from './use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';

const ICONS = {
  default: <Info className="h-5 w-5 shrink-0 text-blue-500" />,
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-current" />,
  warning: <AlertCircle className="h-5 w-5 shrink-0 text-current" />,
  destructive: <XCircle className="h-5 w-5 shrink-0 text-current" />,
} as const;

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => {
        const icon = ICONS[variant ?? 'default'];
        return (
          <Toast key={id} {...props} variant={variant}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{icon}</div>
              <div className="flex-1 min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
