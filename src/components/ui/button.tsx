import { Slot } from "@radix-ui/react-slot";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "light";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
};

const styles = {
  primary: "bg-attabad-turquoise text-white shadow-[0_8px_18px_rgba(28,130,153,.22)] hover:bg-[#176f83]",
  secondary: "border border-karakoram-ink/20 bg-transparent text-karakoram-ink hover:border-karakoram-ink hover:bg-karakoram-ink/5",
  ghost: "bg-transparent text-karakoram-ink hover:bg-karakoram-ink/8",
  danger: "bg-alert-red text-white hover:bg-[#a83227]",
  light: "bg-sandstone-mist text-karakoram-ink hover:bg-white",
};
const sizes = { sm: "min-h-9 px-3 text-sm", md: "min-h-11 px-4 text-sm", lg: "min-h-12 px-5 text-base" };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn("inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55", styles[variant], sizes[size], className)} {...props} />;
});
