import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Settings, AlertTriangle, CheckCircle, Volume2 } from "lucide-react";
import { MobileFrame } from "@/components/layout/MobileFrame";
import { GlassCard } from "@/components/ui/GlassCard";

export default function VisionAnalysis() {
  const navigate = useNavigate();
  const [isRecording] = useState(true);

  return (
    <MobileFrame className="overflow-hidden">
      {/* Header Overlay */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-background/80 to-transparent">
        <button
          onClick={() => navigate("/training")}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 backdrop-blur-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-bold uppercase tracking-widest text-secondary">
            Visión AI
          </h1>
          <p className="text-xs text-muted-foreground">Sentadilla con Barra Alta</p>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 backdrop-blur-sm"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Main Viewfinder */}
      <main className="relative flex-1 bg-background flex items-center justify-center overflow-hidden">
        {/* Mock Video Feed */}
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1000"
          alt="Gym"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />

        {/* Skeleton Overlay SVG */}
        <svg
          viewBox="0 0 400 600"
          className="absolute inset-0 w-full h-full"
          style={{ filter: "drop-shadow(0 0 4px rgba(74, 222, 128, 0.8))" }}
        >
          {/* Body lines */}
          <line x1="200" y1="120" x2="200" y2="220" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
          <line x1="200" y1="220" x2="140" y2="350" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
          <line x1="200" y1="220" x2="260" y2="350" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
          <line x1="140" y1="350" x2="130" y2="480" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
          <line x1="260" y1="350" x2="270" y2="480" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
          
          {/* Arms */}
          <line x1="200" y1="160" x2="130" y2="200" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
          <line x1="200" y1="160" x2="270" y2="200" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
          <line x1="130" y1="200" x2="100" y2="260" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
          <line x1="270" y1="200" x2="300" y2="260" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />

          {/* Warning on knee */}
          <line x1="140" y1="350" x2="130" y2="480" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px rgba(239, 68, 68, 0.9))" }} />
          
          {/* Joints */}
          <circle cx="200" cy="100" r="25" fill="none" stroke="#4ade80" strokeWidth="3" />
          <circle cx="200" cy="160" r="8" fill="white" stroke="#4ade80" strokeWidth="2" />
          <circle cx="200" cy="220" r="8" fill="white" stroke="#4ade80" strokeWidth="2" />
          <circle cx="140" cy="350" r="10" fill="white" stroke="#ef4444" strokeWidth="3" className="animate-pulse" />
          <circle cx="260" cy="350" r="8" fill="white" stroke="#4ade80" strokeWidth="2" />
        </svg>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-20 left-4 flex items-center gap-2 bg-destructive/80 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-foreground rounded-full animate-pulse" />
            <span className="text-xs font-bold text-foreground">REC</span>
          </div>
        )}

        {/* Angle Indicator */}
        <div className="absolute top-1/3 right-4 glass-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Ángulo Rodilla</p>
          <p className="text-2xl font-mono font-bold text-destructive">78°</p>
        </div>
      </main>

      {/* Bottom Feedback Panel */}
      <div className="absolute bottom-0 left-0 right-0 glass-panel border-t border-white/10 p-4 space-y-4">
        {/* Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="border-destructive/50 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-destructive text-sm">
                ⚠️ Rodilla izquierda hacia adentro
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Empuja la rodilla hacia afuera, en línea con los dedos del pie. El ángulo
                actual (78°) está por debajo del rango seguro (90°+).
              </p>
            </div>
            <button className="p-2 hover:bg-muted rounded-lg">
              <Volume2 className="w-5 h-5 text-muted-foreground" />
            </button>
          </GlassCard>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-2">
            <p className="text-lg font-bold text-primary">92%</p>
            <p className="text-[10px] text-muted-foreground">Forma general</p>
          </GlassCard>
          <GlassCard className="text-center py-2">
            <p className="text-lg font-bold">1.8s</p>
            <p className="text-[10px] text-muted-foreground">Tempo</p>
          </GlassCard>
          <GlassCard className="text-center py-2 border-primary/30">
            <p className="text-lg font-bold text-primary flex items-center justify-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Bueno
            </p>
            <p className="text-[10px] text-muted-foreground">Profundidad</p>
          </GlassCard>
        </div>
      </div>
    </MobileFrame>
  );
}