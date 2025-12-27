import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MobileFrameProps {
  children: ReactNode;
  className?: string;
}

export function MobileFrame({ children, className }: MobileFrameProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 md:p-4">
      <div
        className={cn(
          "relative w-full max-w-md bg-background min-h-screen md:min-h-0 md:h-[844px] shadow-2xl overflow-hidden md:border-4 md:border-slate-800 md:rounded-[3rem] flex flex-col",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function MobileContent({ children, className }: MobileFrameProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto hide-scrollbar", className)}>
      {children}
    </div>
  );
}