import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border-2 border-[var(--border)] px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.1em]",
  {
    variants: {
      variant: {
        default: "bg-[var(--card)] text-[var(--foreground)]",
        accent: "bg-[var(--primary)] text-white border-[var(--primary)]",
        muted: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--muted)]",
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
