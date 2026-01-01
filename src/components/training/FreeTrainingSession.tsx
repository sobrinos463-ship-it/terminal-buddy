import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Timer,
  CheckCircle,
  Minus,
  Plus,
  Dumbbell,
  Save,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SelectedExercise {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
}

interface FreeTrainingSessionProps {
  exercises: SelectedExercise[];
  sessionId: string;
  onBack: () => void;
}

interface ExerciseProgress {
  name: string;
  muscleGroup: string;
  totalSets: number;
  completedSets: number;
  currentWeight: string;
  reps: string;
  completed: boolean;
}

export function FreeTrainingSession({ exercises, sessionId, onBack }: FreeTrainingSessionProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [showRestChoice, setShowRestChoice] = useState(false);
  
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>(
    exercises.map((ex) => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      totalSets: ex.sets,
      completedSets: 0,
      currentWeight: "0",
      reps: ex.reps,
      completed: false,
    }))
  );

  const currentExercise = exerciseProgress[currentExerciseIndex];
  const totalExercises = exerciseProgress.length;
  const completedCount = exerciseProgress.filter((e) => e.completed).length;

  // Main timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && restTimer === null) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, restTimer]);

  // Rest timer
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

  const adjustWeight = (delta: number) => {
    const current = parseFloat(currentExercise.currentWeight) || 0;
    const newWeight = Math.max(0, current + delta);
    setExerciseProgress((prev) =>
      prev.map((ex, idx) =>
        idx === currentExerciseIndex ? { ...ex, currentWeight: newWeight.toString() } : ex
      )
    );
  };

  const handleCompleteSet = async () => {
    if (!currentExercise) return;

    // Log completed set
    await supabase.from("completed_sets").insert({
      session_id: sessionId,
      exercise_name: currentExercise.name,
      set_number: currentSet,
      weight_used: currentExercise.currentWeight + " kg",
      reps_completed: parseInt(currentExercise.reps) || 0,
    });

    if (currentSet < currentExercise.totalSets) {
      setCurrentSet(currentSet + 1);
      setShowRestChoice(true);
    } else {
      // Exercise completed
      setExerciseProgress((prev) =>
        prev.map((ex, idx) =>
          idx === currentExerciseIndex
            ? { ...ex, completedSets: currentExercise.totalSets, completed: true }
            : ex
        )
      );

      if (currentExerciseIndex < totalExercises - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setCurrentSet(1);
        setShowRestChoice(true);
      } else {
        // All exercises completed
        handleFinishWorkout();
      }
    }
  };

  const handleChooseRest = () => {
    setShowRestChoice(false);
    setRestTimer(90); // Default 90s rest
  };

  const handleChooseContinue = () => {
    setShowRestChoice(false);
  };

  const handleFinishWorkout = async () => {
    if (!user) return;

    try {
      const xpEarned = 25 + completedCount * 5;

      await supabase
        .from("workout_sessions")
        .update({
          completed_at: new Date().toISOString(),
          duration_seconds: timer,
          xp_earned: xpEarned,
        })
        .eq("id", sessionId);

      // Update user XP
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_xp")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ total_xp: (profile.total_xp || 0) + xpEarned })
          .eq("user_id", user.id);
      }

      toast.success("¡Entrenamiento libre completado!");
      navigate("/summary", {
        state: {
          duration: timer,
          xpEarned,
          exercisesCompleted: completedCount + 1,
        },
      });
    } catch (err) {
      console.error("Error finishing workout:", err);
      toast.error("Error al guardar el entrenamiento");
    }
  };

  const progress =
    totalExercises > 0
      ? (completedCount / totalExercises) * 100 +
        (currentSet / currentExercise.totalSets) * (100 / totalExercises)
      : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-20 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Libre - Set {currentSet}/{currentExercise?.totalSets || 0}
            </span>
            <span className="text-lg font-mono font-bold text-primary">
              {formatTime(timer)}
            </span>
          </div>
          <button
            onClick={handleFinishWorkout}
            className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm font-bold flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            FIN
          </button>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4">
        {/* Rest Choice Modal */}
        <AnimatePresence>
          {showRestChoice && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <GlassCard className="text-center border-emerald-500/50">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-lg font-bold mb-1">¡Set completado!</p>
                <p className="text-sm text-muted-foreground mb-4">
                  ¿Quieres descansar 90s o seguir?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleChooseRest}
                    className="py-3 bg-muted/80 text-foreground rounded-xl font-semibold flex items-center justify-center gap-2 border border-border"
                  >
                    <Timer className="w-5 h-5" />
                    Descansar
                  </button>
                  <button
                    onClick={handleChooseContinue}
                    className="py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Seguir
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rest Timer */}
        <AnimatePresence>
          {restTimer !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <GlassCard className="text-center border-emerald-500/50">
                <Timer className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Tiempo de descanso</p>
                <p className="text-5xl font-mono font-bold text-emerald-500">
                  {formatTime(restTimer)}
                </p>
                <button
                  onClick={() => setRestTimer(null)}
                  className="mt-4 px-6 py-2 bg-emerald-500/20 text-emerald-500 rounded-xl text-sm font-semibold"
                >
                  Saltar descanso
                </button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Exercise */}
        {!restTimer && !showRestChoice && currentExercise && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard variant="elevated" className="border-emerald-500/30 overflow-hidden">
              {/* Exercise Header */}
              <div className="relative bg-gradient-to-br from-emerald-500/20 to-teal-500/10 -mx-5 -mt-5 mb-4 p-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Dumbbell className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wide mb-1">
                      Ejercicio {currentExerciseIndex + 1}/{totalExercises} • {currentExercise.muscleGroup}
                    </p>
                    <h2 className="text-xl font-bold">{currentExercise.name}</h2>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {/* Sets */}
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold text-emerald-500">
                    {currentSet}
                    <span className="text-lg text-muted-foreground">/{currentExercise.totalSets}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Sets</p>
                </div>

                {/* Reps */}
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold">{currentExercise.reps}</p>
                  <p className="text-xs text-muted-foreground mt-1">Reps</p>
                </div>

                {/* Weight */}
                <div className="bg-muted/50 rounded-xl p-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => adjustWeight(-2.5)}
                      className="w-7 h-7 rounded-lg bg-muted hover:bg-destructive/20 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <p className="text-2xl font-bold min-w-[50px]">
                      {currentExercise.currentWeight}
                    </p>
                    <button
                      onClick={() => adjustWeight(2.5)}
                      className="w-7 h-7 rounded-lg bg-muted hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">kg</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="flex items-center justify-center gap-2 py-4 bg-muted rounded-xl font-semibold"
                >
                  {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isRunning ? "Pausar" : "Reanudar"}
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCompleteSet}
                  className="flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30"
                >
                  <CheckCircle className="w-5 h-5" />
                  ¡Hecho!
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Exercise List */}
        <div>
          <h3 className="font-bold mb-3">Tu entrenamiento libre</h3>
          <div className="space-y-2">
            {exerciseProgress.map((exercise, index) => (
              <motion.div
                key={exercise.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard
                  className={`flex items-center gap-4 ${
                    index === currentExerciseIndex ? "border-emerald-500/50" : ""
                  } ${exercise.completed ? "opacity-60" : ""}`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      exercise.completed
                        ? "bg-emerald-500/20 text-emerald-500"
                        : index === currentExerciseIndex
                        ? "bg-emerald-500 text-white"
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
                      {exercise.totalSets} sets × {exercise.reps} reps • {exercise.muscleGroup}
                    </p>
                  </div>
                  {index === currentExerciseIndex && !exercise.completed && (
                    <ChevronRight className="w-5 h-5 text-emerald-500" />
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
