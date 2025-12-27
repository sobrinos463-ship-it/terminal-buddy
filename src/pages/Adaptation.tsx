import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Brain, TrendingUp, TrendingDown, Minus, CheckCircle } from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";
import { GlassCard } from "@/components/ui/GlassCard";

const adaptations = [
  {
    exercise: "Press Banca",
    change: "+5kg",
    reason: "Completaste todas las reps con buena forma",
    trend: "up",
  },
  {
    exercise: "Press Inclinado",
    change: "Sin cambios",
    reason: "Mantén el peso para consolidar la técnica",
    trend: "neutral",
  },
  {
    exercise: "Fondos",
    change: "-2 reps",
    reason: "Detectada fatiga en el tríceps",
    trend: "down",
  },
];

export default function Adaptation() {
  const navigate = useNavigate();

  return (
    <MobileFrame>
      {/* Top Visual */}
      <div className="relative h-48 bg-gradient-to-b from-accent/20 to-background overflow-hidden shrink-0">
        {/* Scan Line */}
        <div className="absolute inset-0">
          <div className="w-full h-0.5 bg-accent/50 absolute animate-scan" />
        </div>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center mb-4 shadow-lg shadow-accent/30"
          >
            <Brain className="w-10 h-10 text-accent-foreground" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-bold"
          >
            <span className="gradient-text-accent">Adaptación en Tiempo Real</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-muted-foreground mt-1"
          >
            Analizando tu rendimiento...
          </motion.p>
        </div>
      </div>

      {/* Header */}
      <header className="glass-panel sticky top-0 z-20 p-4 flex items-center gap-4 border-b border-white/10">
        <button
          onClick={() => navigate("/training")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold">Ajustes Sugeridos</h2>
          <p className="text-xs text-muted-foreground">Basados en tu sesión actual</p>
        </div>
      </header>

      <MobileContent className="p-4 space-y-4">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="border-accent/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
              <p className="text-sm font-semibold text-accent">Sistema Activo</p>
            </div>
            <p className="text-sm text-muted-foreground">
              El algoritmo de sobrecarga progresiva está monitoreando tu sesión.
              Los ajustes se aplicarán automáticamente.
            </p>
          </GlassCard>
        </motion.div>

        {/* Adaptations List */}
        <div className="space-y-3">
          {adaptations.map((item, index) => (
            <motion.div
              key={item.exercise}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
            >
              <GlassCard className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.trend === "up"
                      ? "bg-primary/20 text-primary"
                      : item.trend === "down"
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.trend === "up" ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : item.trend === "down" ? (
                    <TrendingDown className="w-5 h-5" />
                  ) : (
                    <Minus className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold">{item.exercise}</p>
                    <span
                      className={`text-sm font-bold ${
                        item.trend === "up"
                          ? "text-primary"
                          : item.trend === "down"
                          ? "text-orange-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.change}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* AI Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard className="border-secondary/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-indigo-600 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">Resumen de IA</p>
                <p className="text-sm text-muted-foreground">
                  Tu rendimiento hoy está un <span className="text-primary font-semibold">8% por encima</span> de
                  la media. Estás progresando más rápido de lo esperado. ¡Sigue así!
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Apply Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={() => navigate("/training")}
          className="w-full bg-accent text-accent-foreground font-bold py-4 rounded-2xl shadow-lg shadow-accent/30"
        >
          Aplicar Ajustes
        </motion.button>
      </MobileContent>
    </MobileFrame>
  );
}