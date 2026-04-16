"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border-[3px] border-[var(--border)] font-bold uppercase tracking-[0.1em] transition-all duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
  {
    variants: {
      variant: {
        solid:
          "bg-[var(--primary)] text-white shadow-[var(--shadow-offset)_var(--shadow-offset)_0_0_var(--shadow-color)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[calc(var(--shadow-offset)*1.5)_calc(var(--shadow-offset)*1.5)_0_0_var(--shadow-color)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-[2px_2px_0_0_var(--shadow-color)]",
        frame:
          "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-offset)_var(--shadow-offset)_0_0_var(--shadow-color)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:bg-[var(--muted)] hover:shadow-[calc(var(--shadow-offset)*1.5)_calc(var(--shadow-offset)*1.5)_0_0_var(--shadow-color)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-[2px_2px_0_0_var(--shadow-color)]",
        ghost:
          "border-transparent bg-transparent text-[var(--foreground)] hover:border-[var(--border)] hover:bg-[var(--surface)] hover:shadow-[4px_4px_0_0_var(--shadow-color)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none",
      },
      size: {
        sm: "h-10 px-4 text-xs",
        md: "h-12 px-6 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "size-12",
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
