"use client";

import { useToast } from "@/lib/toast-context";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

const typeConfig = {
  success: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  error: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
  info: {
    icon: Info,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9000] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const config = typeConfig[toast.type];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl max-w-sm ${
              config.bg
            } bg-zinc-900/80 ${
              toast.exiting ? "animate-toast-out" : "animate-toast-in"
            }`}
          >
            <Icon size={18} className={`${config.color} shrink-0`} />
            <span className="text-sm text-white flex-1">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-0.5 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-white transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
