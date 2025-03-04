
import * as React from "react";
import { useToast } from "@/lib/toast-context";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastViewport,
  ToastTitle
} from "@/components/ui/toast";

export function Toaster() {
  const { state, removeToast } = useToast();

  return (
    <ToastProvider>
      {state.toasts.map(({ id, title, message, type }) => (
        <Toast key={id} variant={type}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {message && (
              <ToastDescription>{message}</ToastDescription>
            )}
          </div>
          <ToastClose onClick={() => removeToast(id)} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
