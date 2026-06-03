import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "cta" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gold text-white font-semibold hover:bg-gold-light active:bg-gold-dark",
  cta:
    "bg-cta text-white font-bold hover:bg-cta-light active:bg-cta-dark shadow-lg shadow-cta/20",
  secondary:
    "bg-bg-elevated border border-border text-text-primary hover:border-gold/50 hover:text-gold",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
  danger: "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-2xl gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all cursor-pointer",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
);

Button.displayName = "Button";
