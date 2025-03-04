"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";

// Define Toast type
export type ToastType = "default" | "success" | "error" | "warning" | "info";

// Radix UI Toast components
const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        success: "border-green-500 bg-green-50 text-green-900 dark:bg-green-900 dark:text-green-50",
        error: "border-red-500 bg-red-50 text-red-900 dark:bg-red-900 dark:text-red-50",
        warning: "border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-50",
        info: "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-900 dark:text-blue-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};

type ToastType = "success" | "error" | "warning" | "info" | "default";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

interface ToastContextType {
  showToast: (props: ToastProps) => void;
  hideToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface Toast extends ToastProps {
  id: string;
  createdAt: Date;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const showToast = React.useCallback(({ message, type = "info", duration = 5000, onClose }: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [
      ...prevToasts,
      { id, message, type, duration, onClose, createdAt: new Date() },
    ]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }

    return id;
  }, []);

  const hideToast = React.useCallback((id: string) => {
    setToasts((prevToasts) => {
      const toast = prevToasts.find((t) => t.id === id);
      if (toast?.onClose) {
        toast.onClose();
      }
      return prevToasts.filter((t) => t.id !== id);
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <AnimatePresence>
        <div className="fixed bottom-0 right-0 z-100 p-4 flex flex-col gap-2 max-w-md w-full">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
          ))}
        </div>
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const typeStyles = {
    success: {
      bg: "bg-gradient-to-r from-green-500/90 to-green-600/90",
      icon: "✓",
      iconBg: "bg-green-400",
    },
    error: {
      bg: "bg-gradient-to-r from-red-500/90 to-red-600/90",
      icon: "✕",
      iconBg: "bg-red-400",
    },
    warning: {
      bg: "bg-gradient-to-r from-amber-500/90 to-amber-600/90",
      icon: "!",
      iconBg: "bg-amber-400",
    },
    info: {
      bg: "bg-gradient-to-r from-brand-yellow/90 to-brand-yellow-dim",
      icon: "i",
      iconBg: "bg-brand-yellow",
    },
    default: {
      bg: "bg-gradient-to-r from-gray-500/90 to-gray-600/90",
      icon: "",
      iconBg: "bg-gray-400",
    },
  };

  const { bg, icon, iconBg } = typeStyles[toast.type || "info"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`${bg} backdrop-blur-lg text-white rounded-lg shadow-lg p-4 min-w-80 relative overflow-hidden`}
    >
      <div className="flex items-start gap-3">
        <div className={`${iconBg} text-black h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold`}>
          {icon}
        </div>
        <div className="flex-1 mr-6">
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/20 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: toast.duration ? toast.duration / 1000 : 5, ease: "linear" }}
        className="absolute bottom-0 left-0 h-1 bg-white/30"
      />
    </motion.div>
  );
}