import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Trophy, TrendingUp, Flame, Dumbbell, Clock, Zap, Share2 } from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";
import { BottomNav } from "@/components/layout/BottomNav";
import { GlassCard } from "@/components/ui/GlassCard";

const exerciseSummary = [
  { name: "Press Banca", volume: "2,800 kg", change: "+140kg", trend: "up" },
  { name: "Press Inclinado", volume: "2,000 kg", change: "+100kg", trend: "up" },
  { name: "Aperturas", volume: "960 kg", change: "=", trend: "neutral" },
  { name: "Fondos", volume: "BW × 30", change: "+5 reps", trend: "up" },
];

export default function Summary() {
  const navigate = useNavigate();

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
          <h2 className="text-2xl font-bold">¡Sesión Épica!</h2>
          <p className="text-muted-foreground">
            Has superado tu récord personal en <span className="text-primary font-semibold">2 ejercicios</span>
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
            <p className="text-xl font-bold">47:32</p>
            <p className="text-xs text-muted-foreground">Duración</p>
          </GlassCard>
          <GlassCard className="text-center">
            <Dumbbell className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold">6,760</p>
            <p className="text-xs text-muted-foreground">kg movidos</p>
          </GlassCard>
          <GlassCard className="text-center">
            <Flame className="w-5 h-5 text-orange-400 mx-auto mb-2" />
            <p className="text-xl font-bold">385</p>
            <p className="text-xs text-muted-foreground">kcal</p>
          </GlassCard>
        </motion.div>

        {/* Progressive Overload Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="border-secondary/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-indigo-600 flex items-center justify-center animate-pulse">
                <Zap className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="font-bold">Sobrecarga Progresiva</p>
                <p className="text-xs text-muted-foreground">
                  Análisis de IA sobre tu progreso
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Volumen total</span>
                <span className="text-sm font-semibold text-primary">+8.2% vs semana pasada</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "82%" }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Exercise Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-bold mb-3">Desglose por Ejercicio</h3>
          <div className="space-y-2">
            {exerciseSummary.map((exercise, index) => (
              <GlassCard key={exercise.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{exercise.name}</p>
                    <p className="text-xs text-muted-foreground">{exercise.volume}</p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    exercise.trend === "up"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {exercise.trend === "up" && <TrendingUp className="w-4 h-4" />}
                  {exercise.change}
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>

        {/* AI Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard>
            <p className="text-xs text-secondary font-semibold uppercase tracking-wide mb-2">
              Recomendación para la próxima sesión
            </p>
            <p className="text-sm text-muted-foreground">
              Basándome en tu rendimiento, te sugiero aumentar el peso en
              <span className="text-primary font-semibold"> Press Banca (+2.5kg)</span> y
              mantener el volumen en los demás ejercicios para una recuperación óptima.
            </p>
          </GlassCard>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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