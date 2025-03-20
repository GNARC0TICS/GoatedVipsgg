import * as React from "react";
import { useToast, type Toast } from "@/hooks/use-toast.tsx";
import {
  Toast as ToastComponent,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, type, ...props }: Toast) {
        // Convert the toast type to a variant that the Toast component accepts
        const variant = type === "destructive" ? "destructive" : 
                        type === "success" ? "success" : "default";
                        
        return (
          <ToastComponent key={id} variant={variant} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </ToastComponent>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
