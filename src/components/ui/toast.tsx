"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "error";
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: Variant;
}

const ToastContext = createContext<{
  toast: (t: { title: string; description?: string; variant?: Variant }) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "default" }: { title: string; description?: string; variant?: Variant }) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const icons: Record<Variant, React.ReactNode> = {
  default: <Info className="h-4 w-4 text-accent" />,
  success: <CheckCircle2 className="h-4 w-4 text-success" />,
  error: <AlertCircle className="h-4 w-4 text-danger" />,
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm animate-rise-in items-start gap-3 rounded-xl border border-border bg-surface-2/95 p-3.5 shadow-card-hover backdrop-blur",
      )}
      role="status"
    >
      <span className="mt-0.5">{icons[toast.variant]}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p>}
      </div>
      <button onClick={onDismiss} className="text-muted transition-colors hover:text-foreground" aria-label="Fermer">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
