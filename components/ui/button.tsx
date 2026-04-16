"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border-2 font-semibold uppercase tracking-[0.16em] transition-transform duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
  {
    variants: {
      variant: {
        solid:
          "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] shadow-[6px_6px_0_0_var(--shadow-hard)] hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-[3px_3px_0_0_var(--shadow-hard)]",
        frame:
          "border-[var(--line-strong)] bg-[var(--panel)] text-[var(--foreground)] shadow-[6px_6px_0_0_var(--shadow-hard)] hover:-translate-y-0.5 hover:translate-x-0.5 hover:border-[var(--accent)] hover:shadow-[3px_3px_0_0_var(--shadow-hard)]",
        ghost:
          "border-transparent bg-transparent text-[var(--muted-foreground)] hover:border-[var(--line)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]",
      },
      size: {
        sm: "h-10 px-4 text-[0.72rem]",
        md: "h-12 px-5 text-[0.76rem]",
        lg: "h-14 px-6 text-[0.8rem]",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "md",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
