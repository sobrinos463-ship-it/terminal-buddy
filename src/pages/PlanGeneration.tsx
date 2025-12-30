import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CheckCircle, Sparkles, Brain, Target, Zap, AlertCircle } from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const phases = [
  { icon: Brain, label: "Analizando perfil", description: "Procesando tus respuestas..." },
  { icon: Target, label: "Calculando objetivos", description: "Definiendo metas realistas..." },
  { icon: Zap, label: "Generando plan", description: "Creando rutinas personalizadas..." },
  { icon: Sparkles, label: "Optimizando", description: "Ajustes finales de IA..." },
];

export default function PlanGeneration() {
  const navigate = useNavigate();
  const [currentPhase, setCurrentPhase] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const generateWorkout = async () => {
      setIsGenerating(true);
      
      // Simulate phase 1
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCompleted([0]);
      setCurrentPhase(1);
      
      // Simulate phase 2
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCompleted([0, 1]);
      setCurrentPhase(2);
      
      try {
        // Phase 3: Actually generate workout with AI
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("No hay sesión activa");
        }

        const { data, error: fnError } = await supabase.functions.invoke('generate-workout', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (fnError) {
          throw fnError;
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        // Phase 3 complete
        setCompleted([0, 1, 2]);
        setCurrentPhase(3);
        
        // Phase 4: Final
        await new Promise(resolve => setTimeout(resolve, 800));
        setCompleted([0, 1, 2, 3]);
        
        toast.success("¡Tu plan ha sido generado!");
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        navigate("/dashboard");
        
      } catch (err) {
        console.error("Error generating workout:", err);
        setError(err instanceof Error ? err.message : "Error al generar el plan");
        toast.error("Error al generar el plan");
      } finally {
        setIsGenerating(false);
      }
    };

    generateWorkout();
  }, [navigate]);

  const handleRetry = () => {
    setError(null);
    setCurrentPhase(0);
    setCompleted([]);
    window.location.reload();
  };

  return (
    <MobileFrame>
      {/* Header */}
      <nav className="glass-panel sticky top-0 z-20 p-4 flex items-center justify-between border-b border-white/10">
        <button
          onClick={() => navigate("/onboarding")}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold tracking-widest text-secondary uppercase">
            Fase 3: Optimización
          </span>
          <span className="text-xs text-muted-foreground">
            {currentPhase + 1} de {phases.length}
          </span>
        </div>
        <div className="w-10" />
      </nav>

      <MobileContent className="p-6 flex flex-col items-center justify-center">
        {error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Error al generar tu plan</h2>
            <p className="text-muted-foreground text-sm mb-6">{error}</p>
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
            >
              Reintentar
            </button>
          </motion.div>
        ) : (
          <>
            {/* Main Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative mb-12"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center animate-pulse">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center shadow-lg shadow-secondary/30">
                  <Brain className="w-12 h-12 text-secondary-foreground" />
                </div>
              </div>
              
              {/* Orbiting dots */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                <div className="absolute -top-2 left-1/2 w-3 h-3 bg-primary rounded-full" />
              </motion.div>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                <div className="absolute top-1/2 -right-2 w-2 h-2 bg-accent rounded-full" />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10"
            >
              <h1 className="text-2xl font-bold mb-2">
                <span className="gradient-text-accent">Generando</span> tu Plan Maestro
              </h1>
              <p className="text-muted-foreground text-sm">
                Nuestra IA está creando un programa único para ti
              </p>
            </motion.div>

            {/* Progress Steps */}
            <div className="w-full max-w-xs space-y-4">
              <AnimatePresence mode="popLayout">
                {phases.map((phase, index) => {
                  const isCompleted = completed.includes(index);
                  const isCurrent = currentPhase === index && !isCompleted;
                  const isPending = index > currentPhase;

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.2 }}
                      className={`glass-card flex items-center gap-4 transition-all ${
                        isCurrent ? "border-secondary/50 shadow-lg shadow-secondary/10" : ""
                      } ${isPending ? "opacity-50" : ""}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          isCompleted
                            ? "bg-primary text-primary-foreground"
                            : isCurrent
                            ? "bg-secondary/20 text-secondary animate-pulse"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <phase.icon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{phase.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {isCurrent ? phase.description : isCompleted ? "Completado" : "Pendiente"}
                        </p>
                      </div>
                      {isCurrent && (
                        <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Progress Text */}
            <motion.p
              key={currentPhase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 text-center text-sm text-muted-foreground"
            >
              {Math.round(((completed.length) / phases.length) * 100)}% completado
            </motion.p>
          </>
        )}
      </MobileContent>
    </MobileFrame>
  );
}
