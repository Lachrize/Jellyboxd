import { cn } from "@/lib/utils";

/**
 * Lightweight CSS-only tooltip (no JS, no portal). Shows `label` on hover/focus
 * of its children. Uses a named group so it never clashes with card `group`s.
 */
export function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-normal text-foreground opacity-0 shadow-card-hover transition-opacity duration-150 group-hover/tt:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
