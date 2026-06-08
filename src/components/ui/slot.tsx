import { cloneElement, forwardRef, isValidElement } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal Slot — merges props onto a single child element so `asChild` works
 * (e.g. <Button asChild><Link/></Button>) without pulling in Radix.
 */
export const Slot = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ children, className, ...props }, ref) => {
    if (!isValidElement(children)) return null;
    const child = children as React.ReactElement<any>;
    return cloneElement(child, {
      ...props,
      ...child.props,
      ref,
      className: cn(className, child.props.className),
    });
  },
);
Slot.displayName = "Slot";
