import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-primary/10 text-primary",
      secondary: "bg-secondary text-secondary-foreground",
      destructive: "bg-destructive/10 text-destructive",
      success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      admin: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
      employee: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
      outline: "border border-border",
    },
  },
  defaultVariants: { variant: "default" },
});
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
export function Badge({ className, variant, ...p }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...p} />;
}
