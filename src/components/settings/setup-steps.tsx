import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const SETUP_STEPS = [
  { number: 1, label: "Serveur" },
  { number: 2, label: "Connexion" },
];

/** Jellyseerr-style step indicator shared by the setup and login screens. */
export function SetupSteps({ current }: { current: number }) {
  return (
    <nav className="mt-6">
      <ol className="flex items-center justify-center gap-5 rounded-2xl border border-white/10 bg-gray-950/40 px-6 py-5 shadow-xl shadow-black/40 ring-1 ring-white/[0.04] backdrop-blur">
        {SETUP_STEPS.map((step, i) => {
          const completed = step.number < current;
          const active = step.number === current;
          const isLast = i === SETUP_STEPS.length - 1;
          return (
            <li key={step.number} className="flex items-center gap-5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    completed && "bg-indigo-600 text-white",
                    active && "border-2 border-indigo-500 text-indigo-300",
                    !completed && !active && "border-2 border-gray-600 text-gray-500",
                  )}
                >
                  {completed ? <Check className="h-5 w-5" /> : step.number}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-sm font-medium leading-tight",
                    active || completed ? "text-white" : "text-gray-500",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <span
                  className={cn(
                    "h-px w-12 shrink-0 sm:w-20",
                    completed ? "bg-indigo-500/60" : "bg-white/15",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
