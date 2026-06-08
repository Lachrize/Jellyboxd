import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted " +
  "transition-colors focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, "h-11", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, "min-h-[120px] resize-y leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";
