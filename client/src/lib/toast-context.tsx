import React, { createContext, useContext } from 'react';
import { ToastActionElement, ToastProps } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

type ToastContextType = {
  toast: (props: ToastProps & { action?: ToastActionElement }) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastContextProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
    </ToastContext.Provider>
  );
}

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastContextProvider');
  }
  return context;
};