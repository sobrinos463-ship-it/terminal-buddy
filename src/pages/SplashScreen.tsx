import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronRight, Loader2 } from "lucide-react";
import { MobileFrame } from "@/components/layout/MobileFrame";
import { useAuth } from "@/hooks/useAuth";

export default function SplashScreen() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      // If user is logged in, redirect to dashboard
      if (!loading && user) {
        navigate("/dashboard");
      } else {
        setShowContent(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, loading, navigate]);

  // If still loading auth, keep showing splash
  if (loading) {
    return (
      <MobileFrame>
        <div className="flex-1 flex flex-col items-center justify-center bg-background">
          <div className="w-24 h-24 mb-6 rounded-2xl bg-primary flex items-center justify-center animate-pulse-glow">
            <Zap className="w-12 h-12 text-primary-foreground fill-primary-foreground" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame>
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1000')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />

      {/* Splash Overlay */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-50 bg-background flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="w-24 h-24 mb-6 rounded-2xl bg-primary flex items-center justify-center animate-pulse-glow">
                <Zap className="w-12 h-12 text-primary-foreground fill-primary-foreground" />
              </div>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-muted-foreground text-sm tracking-widest uppercase"
            >
              Cargando tu coach...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative flex-1 flex flex-col justify-end p-8 pb-12 z-10"
          >
            {/* Floating Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 animate-float"
            >
              <div className="glass-card px-4 py-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center animate-pulse-glow">
                  <Zap className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Powered by</p>
                  <p className="font-bold text-sm">Inteligencia Artificial</p>
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-6"
            >
              <h1 className="text-4xl font-extrabold leading-tight mb-3">
                Tu Entrenador
                <br />
                <span className="gradient-text-energy">Personal con IA</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Planes personalizados, adaptación en tiempo real y análisis de
                técnica por visión.
              </p>
            </motion.div>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={() => navigate("/auth")}
              className="w-full bg-primary text-primary-foreground font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all active:scale-[0.98]"
            >
              Comenzar mi Transformación
              <ChevronRight className="w-5 h-5" />
            </motion.button>

            {/* Already have account */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={() => navigate("/auth")}
              className="mt-4 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ya tengo una cuenta
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileFrame>
  );
}
