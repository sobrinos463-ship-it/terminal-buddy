import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Camera,
  User,
  Dumbbell,
  Brain,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Sparkles,
  Zap,
  Heart,
  Loader2,
} from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";
import { BottomNav } from "@/components/layout/BottomNav";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  streak_days: number;
  total_xp: number;
  experience_level: string | null;
}

const coachPersonalities = [
  { id: "drill", icon: Zap, label: "Drill Sergeant", description: "Sin excusas, máximo rendimiento" },
  { id: "friend", icon: Heart, label: "Amigo Motivador", description: "Apoyo constante y celebraciones" },
  { id: "scientist", icon: Brain, label: "El Científico", description: "Datos, métricas y optimización" },
];

const menuItems = [
  { icon: User, label: "Datos Personales", path: "/profile" },
  { icon: Dumbbell, label: "Preferencias de Entrenamiento", path: "/profile" },
  { icon: Brain, label: "Configuración de IA", path: "/profile" },
  { icon: Bell, label: "Notificaciones", path: "/profile" },
  { icon: Shield, label: "Privacidad y Datos", path: "/profile" },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [selectedPersonality, setSelectedPersonality] = useState("scientist");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast({
        title: "Sesión cerrada",
        description: "¡Hasta pronto, máquina!",
      });
      navigate("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cerrar la sesión",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuario";
  const experienceLabel = {
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzado",
    elite: "Elite",
  }[profile?.experience_level || "beginner"] || "Principiante";

  return (
    <MobileFrame>
      {/* Header */}
      <nav className="glass-panel sticky top-0 z-20 flex items-center justify-between p-4 border-b border-white/10">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Perfil Técnico</h1>
        <button className="p-2 text-secondary font-semibold hover:bg-secondary/10 rounded-lg">
          Guardar
        </button>
      </nav>

      <MobileContent className="px-4 pb-24 space-y-8">
        {/* User Identity Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center pt-4"
        >
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-24 h-24 rounded-full border-4 border-secondary shadow-lg shadow-secondary/20 object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-secondary shadow-lg shadow-secondary/20 bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-3xl font-bold text-primary-foreground">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <button className="absolute bottom-0 right-0 bg-secondary p-2 rounded-full border-2 border-background">
              <Camera className="w-4 h-4 text-secondary-foreground" />
            </button>
          </div>
          <h2 className="mt-4 text-xl font-bold">{displayName}</h2>
          <p className="text-sm text-muted-foreground">
            {experienceLabel} • {user?.email}
          </p>

          {/* Quick Stats */}
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{profile?.total_xp || 0}</p>
              <p className="text-xs text-muted-foreground">XP Total</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold">{profile?.streak_days || 0}</p>
              <p className="text-xs text-muted-foreground">Racha Actual</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold">4.8</p>
              <p className="text-xs text-muted-foreground">Promedio IA</p>
            </div>
          </div>
        </motion.section>

        {/* AI Coach Personality */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-secondary" />
            <h3 className="font-bold">Personalidad del Coach IA</h3>
          </div>
          <div className="space-y-3">
            {coachPersonalities.map((personality) => (
              <GlassCard
                key={personality.id}
                className={`flex items-center gap-4 cursor-pointer transition-all ${
                  selectedPersonality === personality.id
                    ? "border-secondary/50 bg-secondary/10 shadow-lg shadow-secondary/10"
                    : "hover:border-white/20"
                }`}
                onClick={() => setSelectedPersonality(personality.id)}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedPersonality === personality.id
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <personality.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{personality.label}</p>
                  <p className="text-xs text-muted-foreground">{personality.description}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 ${
                    selectedPersonality === personality.id
                      ? "border-secondary bg-secondary"
                      : "border-muted-foreground"
                  }`}
                >
                  {selectedPersonality === personality.id && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-secondary-foreground rounded-full" />
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.section>

        {/* Settings Menu */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-bold mb-4">Configuración</h3>
          <GlassCard className="divide-y divide-border p-0 overflow-hidden">
            {menuItems.map((item) => (
              <button
                key={item.label}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </GlassCard>
        </motion.section>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 py-4 text-destructive hover:bg-destructive/10 rounded-2xl transition-colors disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            <span className="font-semibold">Cerrar Sesión</span>
          </button>
        </motion.div>
      </MobileContent>

      <BottomNav />
    </MobileFrame>
  );
}
