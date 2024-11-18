"use client";

import { createContext, useContext, useState } from "react";

type ToastType = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastContextType = {
  toast: (props: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const toast = (props: ToastType) => {
    setToasts((current) => [...current, props]);
    setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-0 right-0 p-4 space-y-4">
        {toasts.map((t, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg shadow-lg ${
              t.variant === "destructive" ? "bg-red-600" : "bg-white"
            } text-${t.variant === "destructive" ? "white" : "black"}`}
          >
            {t.title && <div className="font-medium">{t.title}</div>}
            {t.description && <div className="text-sm">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}