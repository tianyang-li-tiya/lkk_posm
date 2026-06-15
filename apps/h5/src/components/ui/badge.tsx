import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold leading-5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#2b1916] text-white",
        secondary: "border-[#eaded5] bg-[#fff9f4] text-[#786a62]",
        success: "border-[#d6eadc] bg-[#edf8f0] text-[#24734d]",
        warning: "border-[#f3ddb0] bg-[#fff4d8] text-[#8a6217]",
        danger: "border-[#ffd5ce] bg-[#fff0ed] text-[#a90f17]"
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
