import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Play, Flame, Trophy, TrendingUp, Calendar, Sparkles, Loader2 } from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";
import { BottomNav } from "@/components/layout/BottomNav";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  streak_days: number;
  total_xp: number;
  goal: string | null;
}

const quickActions = [
  { icon: Play, label: "Iniciar Entreno", color: "bg-primary", path: "/training" },
  { icon: Calendar, label: "Mi Plan", color: "bg-secondary", path: "/chat" },
  { icon: TrendingUp, label: "Progreso", color: "bg-accent", path: "/summary" },
];

const todayWorkout = {
  title: "Pecho & Tríceps",
  duration: "45 min",
  exercises: 6,
  intensity: "Alta",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile(data);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [user]);

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
                  Insight de tu Coach IA
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  ¡Hola {firstName}! Tu racha de {profile?.streak_days || 0} días es impresionante.
                  <span className="text-primary font-semibold"> Sigue así, máquina.</span>
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
            <p className="text-2xl font-bold">+8%</p>
            <p className="text-xs text-muted-foreground">Fuerza</p>
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
            <span className="text-xs text-muted-foreground">Ver todos</span>
          </div>
          <GlassCard
            variant="elevated"
            className="cursor-pointer hover:border-primary/50 transition-all"
            onClick={() => navigate("/training")}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">{todayWorkout.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {todayWorkout.exercises} ejercicios • {todayWorkout.duration}
                </p>
              </div>
              <div className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-semibold">
                {todayWorkout.intensity}
              </div>
            </div>
            <button className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all">
              <Play className="w-5 h-5" />
              Comenzar Sesión
            </button>
          </GlassCard>
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
                const isPast = i < dayIndex;
                const heights = isPast ? [60, 80, 40, 100, 70, 50, 0].slice(0, i + 1) : [];
                const height = isPast ? heights[i] || 0 : isToday ? 80 : 0;
                
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
