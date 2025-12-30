import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Trophy, TrendingUp, Flame, Dumbbell, Clock, Zap, Share2, Home } from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";
import { BottomNav } from "@/components/layout/BottomNav";
import { GlassCard } from "@/components/ui/GlassCard";

interface LocationState {
  duration?: number;
  xpEarned?: number;
  exercisesCompleted?: number;
}

export default function Summary() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const duration = state?.duration || 0;
  const xpEarned = state?.xpEarned || 0;
  const exercisesCompleted = state?.exercisesCompleted || 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // If no state, show a placeholder
  if (!state) {
    return (
      <MobileFrame>
        <header className="p-6 flex justify-between items-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Resumen</h1>
          <div className="w-10" />
        </header>
        <MobileContent className="px-6 pb-24 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Dumbbell className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Sin datos de sesión</h2>
          <p className="text-muted-foreground mb-6">
            Completa un entrenamiento para ver tu resumen
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            Ir al Dashboard
          </button>
        </MobileContent>
        <BottomNav />
      </MobileFrame>
    );
  }

  return (
    <MobileFrame>
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Análisis de Sesión</h1>
        <div className="w-10" />
      </header>

      <MobileContent className="px-6 pb-24 space-y-6">
        {/* Celebration Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 text-primary mb-2 border border-primary/30">
            <Trophy className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold">¡Sesión Completada!</h2>
          <p className="text-muted-foreground">
            Has completado <span className="text-primary font-semibold">{exercisesCompleted} ejercicios</span>
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <GlassCard className="text-center">
            <Clock className="w-5 h-5 text-secondary mx-auto mb-2" />
            <p className="text-xl font-bold">{formatTime(duration)}</p>
            <p className="text-xs text-muted-foreground">Duración</p>
          </GlassCard>
          <GlassCard className="text-center">
            <Dumbbell className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold">{exercisesCompleted}</p>
            <p className="text-xs text-muted-foreground">Ejercicios</p>
          </GlassCard>
          <GlassCard className="text-center">
            <Flame className="w-5 h-5 text-orange-400 mx-auto mb-2" />
            <p className="text-xl font-bold">+{xpEarned}</p>
            <p className="text-xs text-muted-foreground">XP</p>
          </GlassCard>
        </motion.div>

        {/* XP Earned Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="border-secondary/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-indigo-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="font-bold">¡XP Ganados!</p>
                <p className="text-xs text-muted-foreground">
                  Sigue así para subir de nivel
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Base de sesión</span>
                <span className="text-sm font-semibold">+50 XP</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Por ejercicios ({exercisesCompleted})</span>
                <span className="text-sm font-semibold text-primary">+{exercisesCompleted * 10} XP</span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-lg font-bold text-primary">+{xpEarned} XP</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* AI Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-indigo-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs text-secondary font-semibold uppercase tracking-wide mb-2">
                  Recomendación de tu Coach IA
                </p>
                <p className="text-sm text-muted-foreground">
                  ¡Excelente sesión! Recuerda descansar al menos 48 horas antes de trabajar los mismos grupos musculares. 
                  <span className="text-primary font-semibold"> La recuperación es clave para el progreso.</span>
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3"
        >
          <button
            onClick={() => navigate("/dashboard")}
            className="flex-1 bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg shadow-primary/30"
          >
            Volver al Inicio
          </button>
          <button className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </motion.div>
      </MobileContent>

      <BottomNav />
    </MobileFrame>
  );
}