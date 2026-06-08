import { cn } from "@/lib/utils";

type Variant = "default" | "accent" | "outline" | "muted" | "success" | "danger";

const variants: Record<Variant, string> = {
  default: "bg-surface-2 text-foreground border border-border",
  accent: "bg-accent/12 text-accent border border-accent/25",
  outline: "border border-border-strong text-muted-foreground",
  muted: "bg-surface-2 text-muted-foreground",
  success: "bg-success/12 text-success border border-success/25",
  danger: "bg-danger/12 text-danger border border-danger/25",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
