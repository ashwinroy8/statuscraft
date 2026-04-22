import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "green" | "gold" | "red" | "blue" | "outline";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-white/[0.06] text-[#f0f0f2]",
  green: "bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/20",
  gold: "bg-[#F4A100]/15 text-[#F4A100] border border-[#F4A100]/20",
  red: "bg-red-500/15 text-red-400 border border-red-500/20",
  blue: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  outline: "border border-white/10 text-[#8b8b9a]",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
