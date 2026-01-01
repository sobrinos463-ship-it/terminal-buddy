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
  Loader2,
  RefreshCw,
  Minus,
  Plus,
  Dumbbell,
} from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";
import { GlassCard } from "@/components/ui/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight_suggestion: string | null;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
  completed?: boolean;
  current?: boolean;
}

interface Routine {
  id: string;
  name: string;
  description: string | null;
  target_muscle_groups: string[];
  estimated_duration_minutes: number;
  routine_exercises: Exercise[];
}

interface WorkoutSession {
  id: string;
  routine_id: string;
  started_at: string;
}

export default function Training() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [generatingNew, setGeneratingNew] = useState(false);
  const [currentWeight, setCurrentWeight] = useState<string>("0");
  const [showRestChoice, setShowRestChoice] = useState(false);
  const [pendingRestSeconds, setPendingRestSeconds] = useState(0);

  // Fetch active routine
  useEffect(() => {
    const fetchRoutine = async () => {
      if (!user) return;

      try {
        // Get most recent active routine
        const { data: routines, error } = await supabase
          .from('workout_routines')
          .select(`
            *,
            routine_exercises (*)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (routines && routines.length > 0) {
          const routineData = routines[0];
          // Sort exercises by order_index
          routineData.routine_exercises.sort((a: Exercise, b: Exercise) => a.order_index - b.order_index);
          setRoutine(routineData);

          // Create workout session
          const { data: sessionData, error: sessionError } = await supabase
            .from('workout_sessions')
            .insert({
              user_id: user.id,
              routine_id: routineData.id
            })
            .select()
            .single();

          if (sessionError) throw sessionError;
          setSession(sessionData);
        }
      } catch (err) {
        console.error('Error fetching routine:', err);
        toast.error('Error al cargar la rutina');
      } finally {
        setLoading(false);
      }
    };

    fetchRoutine();
  }, [user]);

  // Update current weight when exercise changes
  useEffect(() => {
    if (routine?.routine_exercises[currentExerciseIndex]) {
      const weightSuggestion = routine.routine_exercises[currentExerciseIndex].weight_suggestion || "0";
      // Parse weight correctly - take first number from range like "50-60kg" or "12-16kg (cada mancuerna)"
      const match = weightSuggestion.match(/(\d+)/);
      const parsedWeight = match ? match[1] : "0";
      setCurrentWeight(parsedWeight);
    }
  }, [currentExerciseIndex, routine]);

  // Main timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !restTimer) {
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

  const currentExercise = routine?.routine_exercises[currentExerciseIndex];
  const totalExercises = routine?.routine_exercises.length || 0;

  const adjustWeight = (delta: number) => {
    const current = parseFloat(currentWeight) || 0;
    const newWeight = Math.max(0, current + delta);
    setCurrentWeight(newWeight.toString());
  };

  const handleCompleteSet = async () => {
    if (!currentExercise || !session) return;

    // Log completed set with actual weight used
    await supabase.from('completed_sets').insert({
      session_id: session.id,
      exercise_name: currentExercise.name,
      set_number: currentSet,
      weight_used: currentWeight + " kg"
    });

    if (currentSet < currentExercise.sets) {
      setCurrentSet(currentSet + 1);
      // Show choice modal instead of auto-starting rest
      setPendingRestSeconds(currentExercise.rest_seconds);
      setShowRestChoice(true);
    } else {
      // Exercise completed
      setCompletedExercises(prev => new Set(prev).add(currentExerciseIndex));
      
      if (currentExerciseIndex < totalExercises - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setCurrentSet(1);
        // Show choice modal for next exercise
        setPendingRestSeconds(currentExercise.rest_seconds);
        setShowRestChoice(true);
      } else {
        // Workout complete
        handleFinishWorkout();
      }
    }
  };

  const handleChooseRest = () => {
    setShowRestChoice(false);
    setRestTimer(pendingRestSeconds);
  };

  const handleChooseContinue = () => {
    setShowRestChoice(false);
    // Continue immediately without rest
  };

  const handleFinishWorkout = async () => {
    if (!session || !user) return;

    try {
      // Calculate XP (base 50 + 10 per exercise completed)
      const xpEarned = 50 + (completedExercises.size + 1) * 10;

      // Update session
      await supabase
        .from('workout_sessions')
        .update({
          completed_at: new Date().toISOString(),
          duration_seconds: timer,
          xp_earned: xpEarned
        })
        .eq('id', session.id);

      // Update user XP and streak
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp, streak_days')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            total_xp: (profile.total_xp || 0) + xpEarned,
            streak_days: (profile.streak_days || 0) + 1
          })
          .eq('user_id', user.id);
      }

      navigate('/summary', { 
        state: { 
          duration: timer, 
          xpEarned, 
          exercisesCompleted: completedExercises.size + 1 
        } 
      });
    } catch (err) {
      console.error('Error finishing workout:', err);
      toast.error('Error al guardar el entrenamiento');
    }
  };

  const handleGenerateNew = async () => {
    if (!user) return;
    
    setGeneratingNew(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke('generate-workout', {
        headers: {
          Authorization: `Bearer ${authSession.access_token}`
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('¡Nueva rutina generada!');
      window.location.reload();
    } catch (err) {
      console.error('Error generating new workout:', err);
      toast.error('Error al generar nueva rutina');
    } finally {
      setGeneratingNew(false);
    }
  };

  const progress = totalExercises > 0 
    ? (completedExercises.size / totalExercises) * 100 + 
      (currentSet / (currentExercise?.sets || 4)) * (100 / totalExercises)
    : 0;

  if (loading) {
    return (
      <MobileFrame>
        <MobileContent className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </MobileContent>
      </MobileFrame>
    );
  }

  if (!routine) {
    return (
      <MobileFrame>
        <header className="glass-panel sticky top-0 z-20 p-4 border-b border-white/10">
          <div className="flex items-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold ml-2">Entrenamiento</h1>
          </div>
        </header>
        <MobileContent className="p-6 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
            <TrendingUp className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">No tienes rutina activa</h2>
          <p className="text-muted-foreground mb-6">
            Genera una rutina personalizada con IA para comenzar
          </p>
          <button
            onClick={handleGenerateNew}
            disabled={generatingNew}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-2"
          >
            {generatingNew ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Generar Rutina
              </>
            )}
          </button>
        </MobileContent>
      </MobileFrame>
    );
  }

  const exercises = routine.routine_exercises.map((ex, idx) => ({
    ...ex,
    completed: completedExercises.has(idx),
    current: idx === currentExerciseIndex
  }));

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
              {routine.name} - Set {currentSet}/{currentExercise?.sets || 0}
            </span>
            <span className="text-lg font-mono font-bold text-primary">
              {formatTime(timer)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFinishWorkout}
              className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm font-bold"
            >
              FIN
            </button>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <MobileContent className="p-4 pb-32 space-y-4">
        {/* Rest Timer Overlay */}
        {/* Rest Choice Modal */}
        <AnimatePresence>
          {showRestChoice && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <GlassCard className="text-center border-primary/50">
                <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3" />
                <p className="text-lg font-bold mb-1">¡Set completado!</p>
                <p className="text-sm text-muted-foreground mb-4">
                  ¿Quieres descansar {pendingRestSeconds}s o seguir?
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
                    className="py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-glow"
                  >
                    <Play className="w-5 h-5" />
                    Seguir
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

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
        {!restTimer && !showRestChoice && currentExercise && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard variant="elevated" className="border-primary/30 overflow-hidden">
              {/* Exercise Visual Header */}
              <div className="relative bg-gradient-to-br from-primary/20 to-secondary/10 -mx-5 -mt-5 mb-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
                      <Dumbbell className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">
                        Ejercicio {currentExerciseIndex + 1}/{totalExercises}
                      </p>
                      <h2 className="text-xl font-bold">{currentExercise.name}</h2>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/vision", { state: { exerciseName: currentExercise.name } })}
                    className="px-3 py-2 bg-background/80 backdrop-blur text-accent rounded-xl text-xs font-semibold flex items-center gap-1 border border-accent/30"
                  >
                    <span>👁️</span> IA
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {/* Sets */}
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold text-primary">{currentSet}<span className="text-lg text-muted-foreground">/{currentExercise.sets}</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Sets</p>
                </div>
                
                {/* Reps */}
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold">{currentExercise.reps}</p>
                  <p className="text-xs text-muted-foreground mt-1">Reps</p>
                </div>
                
                {/* Weight with controls */}
                <div className="bg-muted/50 rounded-xl p-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button 
                      onClick={() => adjustWeight(-2.5)}
                      className="w-7 h-7 rounded-lg bg-muted hover:bg-destructive/20 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <p className="text-2xl font-bold min-w-[50px]">{currentWeight}</p>
                    <button 
                      onClick={() => adjustWeight(2.5)}
                      className="w-7 h-7 rounded-lg bg-muted hover:bg-primary/20 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">kg</p>
                </div>
              </div>

              {currentExercise.notes && (
                <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-3 mb-4">
                  <p className="text-sm text-secondary">
                    💡 {currentExercise.notes}
                  </p>
                </div>
              )}

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
                  className="flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/30"
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
          <h3 className="font-bold mb-3">Ejercicios de hoy</h3>
          <div className="space-y-2">
            {exercises.map((exercise, index) => (
              <motion.div
                key={exercise.id}
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
                      {exercise.sets} sets × {exercise.reps} • {exercise.weight_suggestion || 'BW'}
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
                Rutina generada por IA basada en tu perfil. ¡Mantén buena forma y respeta los descansos!
              </p>
            </div>
          </div>
        </GlassCard>
      </MobileContent>
    </MobileFrame>
  );
}
