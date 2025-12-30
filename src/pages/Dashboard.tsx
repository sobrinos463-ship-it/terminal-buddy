import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Play, Flame, Trophy, TrendingUp, Calendar, Sparkles, Loader2, RefreshCw } from "lucide-react";
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

const quickActions = [
  { icon: Play, label: "Iniciar Entreno", color: "bg-primary", path: "/training" },
  { icon: Calendar, label: "Mi Plan", color: "bg-secondary", path: "/chat" },
  { icon: TrendingUp, label: "Progreso", color: "bg-accent", path: "/summary" },
];

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

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Fetch profile
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

      // Fetch active routine
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

      // Fetch sessions for the week
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

      // Get total sessions count for progress
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

  // Generate smart AI insight message
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
    if (hour < 12) return "¡Buenos días!";
    if (hour < 18) return "¡Buenas tardes!";
    return "¡Buenas noches!";
  };

  if (isLoading) {
    return (
      <MobileFrame>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame>
      {/* Header */}
      <header className="glass-panel sticky top-0 z-20 p-6 flex justify-between items-center border-b border-white/10">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-sm font-medium">
            {getGreeting()}
          </span>
          <h1 className="text-2xl font-bold">{firstName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-secondary rounded-full" />
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-full border-2 border-secondary/30 overflow-hidden"
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

      <MobileContent className="p-6 pb-24 space-y-6">
        {/* AI Insight Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-secondary/20 to-transparent rounded-full blur-2xl" />
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-indigo-600 flex items-center justify-center animate-pulse-ai">
                <Sparkles className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-secondary font-semibold uppercase tracking-wide mb-1">
                  Coach IA
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {getAIInsight()}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <GlassCard className="text-center">
            <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{profile?.streak_days || 0}</p>
            <p className="text-xs text-muted-foreground">Racha</p>
          </GlassCard>
          <GlassCard className="text-center">
            <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{profile?.total_xp || 0}</p>
            <p className="text-xs text-muted-foreground">XP Total</p>
          </GlassCard>
          <GlassCard className="text-center">
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{totalSessions}</p>
            <p className="text-xs text-muted-foreground">Entrenos</p>
          </GlassCard>
        </motion.div>

        {/* Today's Workout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">Entreno de Hoy</h2>
            <button 
              onClick={handleGenerateRoutine}
              disabled={generatingRoutine}
              className="text-xs text-primary font-semibold flex items-center gap-1"
            >
              {generatingRoutine ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Nueva rutina
            </button>
          </div>
          {routine ? (
            <GlassCard
              variant="elevated"
              className="cursor-pointer hover:border-primary/50 transition-all"
              onClick={() => navigate("/training")}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">{routine.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {routine.routine_exercises?.length || 0} ejercicios • {routine.estimated_duration_minutes} min
                  </p>
                </div>
                <div className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-semibold">
                  {routine.target_muscle_groups?.[0] || 'Mixto'}
                </div>
              </div>
              <button className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all">
                <Play className="w-5 h-5" />
                Comenzar Sesión
              </button>
            </GlassCard>
          ) : (
            <GlassCard variant="elevated" className="text-center">
              <p className="text-muted-foreground mb-4">No tienes rutina activa</p>
              <button
                onClick={handleGenerateRoutine}
                disabled={generatingRoutine}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                {generatingRoutine ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generar Rutina con IA
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
          <h2 className="font-bold text-lg mb-3">Acciones Rápidas</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <GlassCard
                key={action.label}
                className="text-center cursor-pointer hover:border-white/20 transition-all"
                onClick={() => navigate(action.path)}
              >
                <div
                  className={`w-12 h-12 ${action.color} rounded-2xl flex items-center justify-center mx-auto mb-2`}
                >
                  <action.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <p className="text-xs font-medium">{action.label}</p>
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
          <h2 className="font-bold text-lg mb-3">Esta Semana</h2>
          <GlassCard>
            <div className="flex justify-between items-end h-24">
              {["L", "M", "X", "J", "V", "S", "D"].map((day, i) => {
                const today = new Date().getDay();
                const dayIndex = today === 0 ? 6 : today - 1;
                const isToday = i === dayIndex;
                
                // Calculate which date this day represents
                const dayOffset = i - dayIndex;
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + dayOffset);
                const targetDateStr = targetDate.toISOString().split('T')[0];
                
                // Check if there's a session on this day
                const sessionOnDay = weekSessions.find(s => 
                  s.completed_at.split('T')[0] === targetDateStr
                );
                
                // Calculate height based on duration (max 60 min = 100%)
                const height = sessionOnDay 
                  ? Math.min(100, Math.round((sessionOnDay.duration_seconds / 3600) * 100))
                  : 0;
                
                return (
                  <div key={day} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-8 rounded-t-lg transition-all ${
                        height > 0
                          ? isToday
                            ? "bg-primary"
                            : "bg-secondary/60"
                          : "bg-muted"
                      }`}
                      style={{ height: `${height || 8}%` }}
                    />
                    <span
                      className={`text-xs ${
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
