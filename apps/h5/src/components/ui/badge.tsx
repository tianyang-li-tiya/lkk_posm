import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold leading-5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#3d2017] text-white",
        secondary: "border-[#f0d9b8] bg-[#fff8ec] text-[#8a6e5a]",
        batch: "border-[#FFB133] bg-[#fff0cc] text-[#6b4000]",
        success: "border-[#d6eadc] bg-[#edf8f0] text-[#24734d]",
        warning: "border-[#f0d9b8] bg-[#fff3d6] text-[#7a5510]",
        danger: "border-[#ffc8c0] bg-[#fdeeed] text-[#b91c17]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
