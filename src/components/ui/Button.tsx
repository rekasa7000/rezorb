import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const button = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-bold transition-[transform,box-shadow,background-color] duration-[var(--dur-fast)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "btn-primary font-display uppercase tracking-tight border-2 border-void bg-nebula text-void shadow-[4px_4px_0_var(--plasma)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--plasma)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        secondary: "border-2 border-starlight text-starlight hover:bg-hull-2",
        ghost: "text-moondust hover:text-starlight hover:bg-hull/60",
        danger: "border-2 border-void bg-redshift text-void shadow-[4px_4px_0_var(--void)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-xs",
        md: "h-10 rounded-md px-4 text-sm",
        lg: "h-[52px] rounded-lg px-6 text-base",
        xl: "h-16 rounded-lg px-8 text-lg",
        icon: "size-11 rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(button({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";

export { button as buttonVariants };
