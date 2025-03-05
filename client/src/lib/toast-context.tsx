import React, { createContext, useContext, useReducer, ReactNode, useEffect } from "react";
import { 
  ToastProvider, 
  ToastViewport, 
  ToastTitle, 
  ToastDescription, 
  ToastClose,
  Toast,
  type ToastType
} from "@/components/ui/toast";

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastMessage[];
}

type ToastAction =
  | { type: "ADD_TOAST"; payload: Omit<ToastMessage, "id"> }
  | { type: "REMOVE_TOAST"; payload: { id: string } };

const initialState: ToastState = {
  toasts: [],
};

const ToastContext = createContext<{
  state: ToastState;
  toast: (
    title: string, 
    message: string, 
    type?: ToastType,
    duration?: number
  ) => void;
  removeToast: (id: string) => void;
} | undefined>(undefined);

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [
          ...state.toasts,
          { ...action.payload, id: Date.now().toString() },
        ],
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.payload.id),
      };
    default:
      return state;
  }
}

export const ToastContextProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(toastReducer, initialState);

  const toast = (
    title: string, 
    message: string, 
    type: ToastType = "default",
    duration: number = 5000
  ) => {
    const newToast = { title, message, type, duration };
    dispatch({ type: "ADD_TOAST", payload: newToast });
  };

  const removeToast = (id: string) => {
    dispatch({ type: "REMOVE_TOAST", payload: { id } });
  };

  // Auto-remove toasts after their duration
  useEffect(() => {
    const timers = state.toasts.map((toast) => {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration || 5000);
      return { id: toast.id, timer };
    });

    return () => {
      timers.forEach((t) => clearTimeout(t.timer));
    };
  }, [state.toasts]);

  return (
    <ToastContext.Provider value={{ state, toast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastContextProvider");
  }
  return context;
};