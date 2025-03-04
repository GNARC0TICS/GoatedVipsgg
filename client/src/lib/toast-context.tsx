
import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { 
  Toast, 
  ToastProvider, 
  ToastViewport, 
  ToastTitle, 
  ToastDescription, 
  ToastClose,
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
  React.useEffect(() => {
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
      <ToastProvider>
        {state.toasts.map((toast) => (
          <Toast 
            key={toast.id} 
            variant={toast.type}
            className="mb-2"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <ToastTitle>{toast.title}</ToastTitle>
                <ToastDescription>{toast.message}</ToastDescription>
              </div>
              <ToastClose onClick={() => removeToast(toast.id)} />
            </div>
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
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
