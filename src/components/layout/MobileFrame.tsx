import { cn } from "@/lib/utils";
import { ReactNode, forwardRef } from "react";

interface MobileFrameProps {
  children: ReactNode;
  className?: string;
}

export const MobileFrame = forwardRef<HTMLDivElement, MobileFrameProps>(
  ({ children, className }, ref) => {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-0 md:p-4">
        <div
          ref={ref}
          className={cn(
            "relative w-full max-w-md bg-background min-h-screen md:min-h-0 md:h-[844px] shadow-2xl overflow-hidden md:border-2 md:border-border md:rounded-[3rem] flex flex-col",
            className
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

MobileFrame.displayName = "MobileFrame";

export const MobileContent = forwardRef<HTMLDivElement, MobileFrameProps>(
  ({ children, className }, ref) => {
    return (
      <div ref={ref} className={cn("flex-1 overflow-y-auto hide-scrollbar", className)}>
        {children}
      </div>
    );
  }
);

MobileContent.displayName = "MobileContent";