import { cn, hueFromString, initials } from "@/lib/utils";

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
};

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const hue = hueFromString(name);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-border font-medium",
        sizes[size],
        className,
      )}
      style={
        src
          ? undefined
          : {
              background: `linear-gradient(140deg, hsl(${hue} 35% 28%), hsl(${(hue + 40) % 360} 30% 16%))`,
              color: "rgb(var(--foreground))",
            }
      }
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
