import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs));
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e89b55] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#d28a4c] text-[#140d0a] hover:bg-[#e89b55]",
        outline: "border border-[#d28a4c] text-[#e89b55] hover:bg-[#38220f]",
        ghost: "text-[#cfb28c] hover:text-[#f5f1eb]",
      },
      size: {
        default: "px-5 py-3 min-h-10",
        sm: "px-3 py-2",
        icon: "h-10 w-10 p-2",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant || "default"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
