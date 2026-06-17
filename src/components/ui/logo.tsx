import { cn } from "@/lib/utils";

/** Jellyboxd brand mark — jellyfish mascot in the app's design language. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 214"
      className={cn("h-7 w-7 shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="jb-bell-sm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B354D9" />
          <stop offset="0.55" stopColor="#5C6FE0" />
          <stop offset="1" stopColor="#00A4DC" />
        </linearGradient>
        <linearGradient id="jb-bell-inner-sm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="jb-tent-sm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6A4ECB" />
          <stop offset="1" stopColor="#2C6FD8" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#jb-tent-sm)" strokeWidth="6" strokeLinecap="round">
        <path d="M66,118 C60,136 72,148 64,166 C58,180 60,192 56,204" />
        <path d="M83,122 C79,142 91,154 85,174 C81,190 82,198 80,208" />
        <path d="M100,124 C98,144 106,158 100,178 C96,194 99,202 100,210" />
        <path d="M117,122 C121,142 109,154 115,174 C119,190 118,198 120,208" />
        <path d="M134,118 C140,136 128,148 136,166 C142,180 140,192 144,204" />
      </g>
      <path
        d="M38,110 C38,62 64,32 100,32 C136,32 162,62 162,110 Q146.5,128 131,112 Q115.5,128 100,112 Q84.5,128 69,112 Q53.5,128 38,110 Z"
        fill="url(#jb-bell-sm)"
      />
      <path
        d="M52,78 C58,52 78,40 100,40 C122,40 142,52 148,78 C130,62 110,58 100,58 C90,58 70,62 52,78 Z"
        fill="url(#jb-bell-inner-sm)"
      />
      <g>
        <ellipse cx="86" cy="80" rx="11" ry="12" fill="#fff" stroke="#101a44" strokeWidth="1.7" />
        <ellipse cx="116" cy="82" rx="10" ry="11.5" fill="#fff" stroke="#101a44" strokeWidth="1.7" />
        <circle cx="88" cy="83" r="6.4" fill="#101a44" />
        <circle cx="117" cy="85" r="6" fill="#101a44" />
        <circle cx="85.5" cy="80" r="2.2" fill="#fff" />
        <circle cx="114.8" cy="82" r="2" fill="#fff" />
      </g>
      <circle cx="156" cy="58" r="4.5" fill="#FF8000" />
      <circle cx="168" cy="78" r="3" fill="#00E054" />
      <circle cx="36" cy="70" r="3.8" fill="#40BCF4" />
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
