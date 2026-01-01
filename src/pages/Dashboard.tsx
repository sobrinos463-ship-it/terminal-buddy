import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Play, Flame, Trophy, TrendingUp, Calendar, Sparkles, Loader2, RefreshCw, Zap, Target, CheckCircle, Clock, Dumbbell, Activity } from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";
import { BottomNav } from "@/components/layout/BottomNav";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  streak_days: number;
  total_xp: number;
  goal: string | null;
}

interface Routine {
  id: string;
  name: string;
  description: string | null;
  target_muscle_groups: string[];
  estimated_duration_minutes: number;
  routine_exercises: { id: string }[];
}

interface WeeklySession {
  completed_at: string;
  duration_seconds: number;
}

interface TodaySession {
  id: string;
  completed_at: string;
  duration_seconds: number | null;
  xp_earned: number;
  routine_id: string | null;
}

const quickActions = [
  { icon: Play, label: "Rutina", gradient: "from-primary to-accent", path: "/training" },
  { icon: Activity, label: "Libre", gradient: "from-emerald-500 to-teal-500", path: "/training?mode=free" },
  { icon: TrendingUp, label: "Progreso", gradient: "from-amber-500 to-fire-500", path: "/summary" },
];

const WORKOUT_COMPLETED_HOURS = 4; // Show completed state for 4 hours after workout

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingRoutine, setGeneratingRoutine] = useState(false);
  const [lastSessionDays, setLastSessionDays] = useState<number | null>(null);
  const [weekSessions, setWeekSessions] = useState<WeeklySession[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [todayCompletedSession, setTodayCompletedSession] = useState<TodaySession | null>(null);
  const [exercisesCompleted, setExercisesCompleted] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else if (profileData) {
        setProfile(profileData);
      }

      const { data: routines, error: routineError } = await supabase
        .from("workout_routines")
        .select(`
          *,
          routine_exercises (id)
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (routineError) {
        console.error("Error fetching routine:", routineError);
      } else if (routines && routines.length > 0) {
        setRoutine(routines[0]);
      }

      // Check for recently completed session (within last X hours)
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - WORKOUT_COMPLETED_HOURS);
      
      const { data: recentSession } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("completed_at", hoursAgo.toISOString())
        .order("completed_at", { ascending: false })
        .limit(1);

      if (recentSession && recentSession.length > 0) {
        setTodayCompletedSession(recentSession[0]);
        
        // Get exercises count for this session
        const { count } = await supabase
          .from("completed_sets")
          .select("exercise_name", { count: "exact", head: true })
          .eq("session_id", recentSession[0].id);
        
        // Get unique exercises
        const { data: setsData } = await supabase
          .from("completed_sets")
          .select("exercise_name")
          .eq("session_id", recentSession[0].id);
        
        if (setsData) {
          const uniqueExercises = new Set(setsData.map(s => s.exercise_name));
          setExercisesCompleted(uniqueExercises.size);
        }
      }

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("completed_at, duration_seconds")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("completed_at", weekAgo.toISOString())
        .order("completed_at", { ascending: false });

      if (sessions && sessions.length > 0) {
        setWeekSessions(sessions);
        const lastDate = new Date(sessions[0].completed_at);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        setLastSessionDays(diffDays);
      }

      const { count } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("completed_at", "is", null);
      
      setTotalSessions(count || 0);
      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  const getAIInsight = () => {
    const firstName = profile?.full_name?.split(" ")[0] || "máquina";
    const streak = profile?.streak_days || 0;
    const goal = {
      lose_fat: "quemar grasa",
      build_muscle: "ganar músculo",
      strength: "ganar fuerza",
      endurance: "mejorar resistencia",
      maintain: "mantenerte"
    }[profile?.goal || ""] || "entrenar";

    if (lastSessionDays === null) {
      return `${firstName}, ¿listo para tu primer entreno? Tu objetivo es ${goal}.`;
    }
    if (lastSessionDays === 0) {
      return `${firstName}, ¡ya entrenaste hoy! Descansa y recupérate.`;
    }
    if (lastSessionDays === 1) {
      return `${firstName}, buen ritmo. ${streak > 3 ? `Llevas ${streak} días de racha.` : "Sigue así."}`;
    }
    if (lastSessionDays >= 3) {
      return `${firstName}, llevas ${lastSessionDays} días sin entrenar. ¿Vamos hoy?`;
    }
    return `${firstName}, toca ${goal}. Tu cuerpo está listo.`;
  };

  const handleGenerateRoutine = async () => {
    if (!user) return;
    
    setGeneratingRoutine(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke('generate-workout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRoutine(data.routine);
      toast.success('¡Rutina generada!');
    } catch (err) {
      console.error('Error generating routine:', err);
      toast.error('Error al generar la rutina');
    } finally {
      setGeneratingRoutine(false);
    }
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuario";
  const firstName = displayName.split(" ")[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  if (isLoading) {
    return (
      <MobileFrame>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse-ai">
              <Flame className="w-6 h-6 text-primary" />
            </div>
            <span className="text-muted-foreground text-sm">Cargando...</span>
          </div>
        </div>
      </MobileFrame>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const dismissCompletedView = () => {
    setTodayCompletedSession(null);
  };

  // Show "Workout Completed" view if recently finished
  if (todayCompletedSession) {
    return (
      <MobileFrame>
        <header className="glass-panel sticky top-0 z-20 px-5 py-4 flex justify-between items-center border-b border-white/5">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              ¡Bien hecho!
            </span>
            <h1 className="text-xl font-display font-bold gradient-text-fire">{firstName}</h1>
          </div>
          <button
            onClick={dismissCompletedView}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver dashboard
          </button>
        </header>

        <MobileContent className="px-5 py-6 pb-28 space-y-6">
          {/* Celebration Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-lg animate-pulse-ai">
                <CheckCircle className="w-12 h-12 text-primary-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                <Flame className="w-4 h-4 text-white animate-fire-flicker" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold gradient-text-fire">
                ¡Entreno Completado!
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Has dado un paso más hacia tu mejor versión
              </p>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="stat-card">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center mx-auto mb-2">
                <Flame className="w-5 h-5 text-primary animate-fire-flicker" />
              </div>
              <p className="text-2xl font-display font-bold">{profile?.streak_days || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Racha</p>
            </div>
            <div className="stat-card">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-fire-500/10 flex items-center justify-center mx-auto mb-2">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-2xl font-display font-bold">+{todayCompletedSession.xp_earned}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">XP Hoy</p>
            </div>
            <div className="stat-card">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-ember-500/10 flex items-center justify-center mx-auto mb-2">
                <Dumbbell className="w-5 h-5 text-secondary" />
              </div>
              <p className="text-2xl font-display font-bold">{exercisesCompleted}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ejercicios</p>
            </div>
          </motion.div>

          {/* Session Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="card-glow border-primary/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-ember-500 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-display font-bold text-lg">
                    {formatTime(todayCompletedSession.duration_seconds || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Duración total</p>
                </div>
              </div>
              <div className="space-y-2 pt-3 border-t border-border/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">XP Base</span>
                  <span className="font-semibold">+50</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Por ejercicios ({exercisesCompleted})</span>
                  <span className="font-semibold text-primary">+{exercisesCompleted * 10}</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* AI Coach Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary/15 to-transparent rounded-full blur-2xl" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-primary font-semibold uppercase tracking-widest mb-1">
                    Coach IA
                  </p>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    ¡Excelente trabajo, {firstName}! Ahora toca recuperarse. 
                    Hidrátate bien y descansa los músculos trabajados al menos 48h.
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={() => navigate("/summary", { 
                state: { 
                  duration: todayCompletedSession.duration_seconds,
                  xpEarned: todayCompletedSession.xp_earned,
                  exercisesCompleted: exercisesCompleted
                }
              })}
              className="w-full btn-primary-glow py-4 rounded-xl flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">Ver Análisis Completo</span>
            </button>
          </motion.div>
        </MobileContent>

        <BottomNav />
      </MobileFrame>
    );
  }

  return (
    <MobileFrame>
      {/* Header */}
      <header className="glass-panel sticky top-0 z-20 px-5 py-4 flex justify-between items-center border-b border-white/5">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {getGreeting()}
          </span>
          <h1 className="text-xl font-display font-bold gradient-text-fire">{firstName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-xl border-2 border-primary/30 overflow-hidden hover:border-primary/60 transition-all"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </button>
        </div>
      </header>

      <MobileContent className="px-5 py-6 pb-28 space-y-6">
        {/* AI Insight Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="relative overflow-hidden card-glow">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary/15 to-transparent rounded-full blur-2xl" />
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow animate-pulse-ai flex-shrink-0">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-primary font-semibold uppercase tracking-widest mb-1">
                  Coach IA
                </p>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {getAIInsight()}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Today's Workout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg">Entreno de Hoy</h2>
            <button 
              onClick={handleGenerateRoutine}
              disabled={generatingRoutine}
              className="text-xs text-primary font-semibold flex items-center gap-1.5 hover:text-primary/80 transition-colors"
            >
              {generatingRoutine ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Nueva rutina
            </button>
          </div>
          {routine ? (
            <GlassCard
              variant="elevated"
              className="cursor-pointer hover:border-primary/30 transition-all group"
              onClick={() => navigate("/training")}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-lg group-hover:text-primary transition-colors">{routine.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {routine.routine_exercises?.length || 0} ejercicios • {routine.estimated_duration_minutes} min
                  </p>
                </div>
                <div className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold border border-primary/20">
                  {routine.target_muscle_groups?.[0] || 'Mixto'}
                </div>
              </div>
              <button className="w-full btn-primary-glow py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all group-hover:shadow-glow-lg">
                <Play className="w-5 h-5" />
                <span className="font-semibold">Comenzar Sesión</span>
              </button>
            </GlassCard>
          ) : (
            <GlassCard variant="elevated" className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No tienes rutina activa</p>
              <button
                onClick={handleGenerateRoutine}
                disabled={generatingRoutine}
                className="btn-primary-glow px-6 py-3 rounded-xl flex items-center justify-center gap-2 mx-auto"
              >
                {generatingRoutine ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generar con IA
                  </>
                )}
              </button>
            </GlassCard>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-display font-bold text-lg mb-3">Acciones Rápidas</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <GlassCard
                key={action.label}
                className="text-center cursor-pointer hover:border-primary/20 transition-all group py-5"
                onClick={() => navigate(action.path)}
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${action.gradient} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-glow-sm group-hover:shadow-glow transition-all`}
                >
                  <action.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <p className="text-xs font-semibold">{action.label}</p>
              </GlassCard>
            ))}
          </div>
        </motion.div>

        {/* Weekly Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="font-display font-bold text-lg mb-3">Esta Semana</h2>
          <GlassCard className="py-5">
            <div className="flex justify-between items-end h-24 px-2">
              {["L", "M", "X", "J", "V", "S", "D"].map((day, i) => {
                const today = new Date().getDay();
                const dayIndex = today === 0 ? 6 : today - 1;
                const isToday = i === dayIndex;
                
                const dayOffset = i - dayIndex;
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + dayOffset);
                const targetDateStr = targetDate.toISOString().split('T')[0];
                
                const sessionOnDay = weekSessions.find(s => 
                  s.completed_at.split('T')[0] === targetDateStr
                );
                
                const height = sessionOnDay 
                  ? Math.min(100, Math.max(20, Math.round((sessionOnDay.duration_seconds / 3600) * 100)))
                  : 0;
                
                return (
                  <div key={day} className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className={`w-6 rounded-lg transition-all ${
                        height > 0
                          ? isToday
                            ? "bg-gradient-to-t from-primary to-accent shadow-glow-sm"
                            : "bg-gradient-to-t from-secondary/60 to-ember-500/40"
                          : "bg-muted/50"
                      }`}
                      style={{ height: `${height || 8}%` }}
                    />
                    <span
                      className={`text-[10px] font-medium ${
                        isToday ? "text-primary font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </MobileContent>

      <BottomNav />
    </MobileFrame>
  );
}