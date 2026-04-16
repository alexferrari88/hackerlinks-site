import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border-[3px] border-[var(--border)] px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] shadow-[3px_3px_0_0_var(--shadow-color)]",
  {
    variants: {
      variant: {
        default: "bg-[var(--card)] text-[var(--foreground)]",
        accent: "bg-[var(--primary)] text-white",
        muted: "bg-[var(--muted)] text-[var(--muted-foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
