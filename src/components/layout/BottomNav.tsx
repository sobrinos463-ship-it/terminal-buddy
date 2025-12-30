import { forwardRef } from "react";
import { Home, Dumbbell, MessageCircle, BarChart3, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Inicio", path: "/dashboard" },
  { icon: Dumbbell, label: "Entreno", path: "/training" },
  { icon: MessageCircle, label: "Coach", path: "/chat" },
  { icon: BarChart3, label: "Progreso", path: "/summary" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export const BottomNav = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  (props, ref) => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
      <nav 
        ref={ref}
        className="absolute bottom-0 left-0 right-0 glass-panel border-t border-white/10 px-2 py-3 safe-area-inset-bottom"
        {...props}
      >
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-all",
                    isActive && "animate-pulse-ai"
                  )}
                />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }
);

BottomNav.displayName = "BottomNav";