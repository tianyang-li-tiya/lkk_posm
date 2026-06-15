import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ className, value, ...props }, ref) => (
  <div ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-[#f1e5de]", className)} {...props}>
    <div className="h-full rounded-full bg-[#d71920] transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
));
Progress.displayName = "Progress";

export { Progress };
