import { cn } from "@/lib/utils";

/** Jellyboxd brand mark — simple violet monogram in the app's design language. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7 shrink-0", className)} aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="9" className="fill-surface stroke-border" strokeWidth="1.5" />
      <path
        d="M19.5 8.5v11.2c0 3.1-1.9 5-5 5-2.2 0-3.9-.9-4.9-2.5"
        className="stroke-accent"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M22.5 8.5h-7"
        className="stroke-accent"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="23" cy="23" r="2" className="fill-accent" opacity="0.9" />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWordmark && (
        <span className="font-serif text-xl tracking-tight text-foreground">Jellyboxd</span>
      )}
    </span>
  );
}
