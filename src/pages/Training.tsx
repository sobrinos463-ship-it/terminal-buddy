import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Play,
  Pause,
  ChevronRight,
  Timer,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";
import { GlassCard } from "@/components/ui/GlassCard";

const exercises = [
  { name: "Press Banca", sets: 4, reps: "8-10", weight: "70kg", completed: true },
  { name: "Press Inclinado", sets: 4, reps: "10-12", weight: "50kg", completed: true },
  { name: "Aperturas con Mancuernas", sets: 3, reps: "12-15", weight: "16kg", completed: false, current: true },
  { name: "Fondos en Paralelas", sets: 3, reps: "Al fallo", weight: "BW", completed: false },
  { name: "Extensiones de Tríceps", sets: 4, reps: "12-15", weight: "25kg", completed: false },
];

export default function Training() {
  const navigate = useNavigate();
  const [timer, setTimer] = useState(862); // 14:22 in seconds
  const [isRunning, setIsRunning] = useState(true);
  const [currentSet, setCurrentSet] = useState(2);
  const [restTimer, setRestTimer] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !restTimer) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, restTimer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (restTimer !== null && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (restTimer === 0) {
      setRestTimer(null);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCompleteSet = () => {
    if (currentSet < 4) {
      setCurrentSet(currentSet + 1);
      setRestTimer(90);
    }
  };

  const progress = (exercises.filter((e) => e.completed).length / exercises.length) * 100 + 
    (currentSet / 4) * (100 / exercises.length);

  return (
    <MobileFrame>
      {/* Header */}
      <header className="glass-panel sticky top-0 z-20 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Pecho & Tríceps - Set {currentSet}/4
            </span>
            <span className="text-lg font-mono font-bold text-primary">
              {formatTime(timer)}
            </span>
          </div>
          <button
            onClick={() => navigate("/summary")}
            className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm font-bold"
          >
            FINALIZAR
          </button>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <MobileContent className="p-4 pb-32 space-y-4">
        {/* Rest Timer Overlay */}
        <AnimatePresence>
          {restTimer !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <GlassCard className="text-center border-primary/50">
                <Timer className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Tiempo de descanso</p>
                <p className="text-5xl font-mono font-bold text-primary">
                  {formatTime(restTimer)}
                </p>
                <button
                  onClick={() => setRestTimer(null)}
                  className="mt-4 px-6 py-2 bg-primary/20 text-primary rounded-xl text-sm font-semibold"
                >
                  Saltar descanso
                </button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Exercise */}
        {!restTimer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard variant="elevated" className="border-primary/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-primary font-semibold uppercase tracking-wide">
                    Ejercicio Actual
                  </p>
                  <h2 className="text-xl font-bold">Aperturas con Mancuernas</h2>
                </div>
                <button
                  onClick={() => navigate("/vision")}
                  className="px-3 py-2 bg-accent/20 text-accent rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  <span>👁️</span> Visión IA
                </button>
              </div>

              {/* Set Counter */}
              <div className="flex items-center justify-center gap-8 my-6">
                <div className="text-center">
                  <p className="text-4xl font-bold">{currentSet}</p>
                  <p className="text-xs text-muted-foreground">Set actual</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="text-center">
                  <p className="text-4xl font-bold">12-15</p>
                  <p className="text-xs text-muted-foreground">Reps objetivo</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="text-center">
                  <p className="text-4xl font-bold">16kg</p>
                  <p className="text-xs text-muted-foreground">Peso</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="flex items-center justify-center gap-2 py-3 bg-muted rounded-xl font-semibold"
                >
                  {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isRunning ? "Pausar" : "Reanudar"}
                </button>
                <button
                  onClick={handleCompleteSet}
                  className="flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
                >
                  <CheckCircle className="w-5 h-5" />
                  Completar Set
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Exercise List */}
        <div>
          <h3 className="font-bold mb-3">Ejercicios de hoy</h3>
          <div className="space-y-2">
            {exercises.map((exercise, index) => (
              <motion.div
                key={exercise.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard
                  className={`flex items-center gap-4 ${
                    exercise.current ? "border-primary/50" : ""
                  } ${exercise.completed ? "opacity-60" : ""}`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      exercise.completed
                        ? "bg-primary/20 text-primary"
                        : exercise.current
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {exercise.completed ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${exercise.completed ? "line-through" : ""}`}>
                      {exercise.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exercise.sets} sets × {exercise.reps} • {exercise.weight}
                    </p>
                  </div>
                  {exercise.current && (
                    <ChevronRight className="w-5 h-5 text-primary" />
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI Suggestion */}
        <GlassCard className="border-secondary/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-indigo-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs text-secondary font-semibold uppercase tracking-wide mb-1">
                Sugerencia IA
              </p>
              <p className="text-sm text-muted-foreground">
                Tu ritmo está 10% más rápido que la semana pasada. ¡Excelente progreso!
                Considera aumentar 2kg en el próximo ejercicio.
              </p>
            </div>
          </div>
        </GlassCard>
      </MobileContent>
    </MobileFrame>
  );
}