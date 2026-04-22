import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[#25D366] hover:bg-[#1aab52] text-black font-semibold disabled:opacity-40",
  secondary:
    "bg-white/[0.06] hover:bg-white/[0.10] text-[#f0f0f2] border border-white/[0.08]",
  ghost: "hover:bg-white/[0.06] text-[#8b8b9a] hover:text-[#f0f0f2]",
  danger:
    "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-sm rounded-xl",
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
