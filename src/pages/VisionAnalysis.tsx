import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  Camera, 
  CameraOff, 
  AlertTriangle, 
  CheckCircle, 
  Volume2,
  Loader2,
  RotateCcw,
  Info
} from "lucide-react";
import { MobileFrame } from "@/components/layout/MobileFrame";
import { GlassCard } from "@/components/ui/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FormIssue {
  bodyPart: string;
  severity: "warning" | "error" | "good";
  message: string;
  correction: string;
  angle?: number;
  idealAngle?: number;
}

interface FormAnalysis {
  overallScore: number;
  issues: FormIssue[];
  tempo: number;
  depth: "shallow" | "parallel" | "deep";
  depthScore: string;
}

export default function VisionAnalysis() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  
  // Get exercise name from navigation state
  const exerciseName = location.state?.exerciseName || "Ejercicio";

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("No se pudo acceder a la cámara. Verifica los permisos.");
      setIsStreaming(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  }, []);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isStreaming) {
      startCamera();
    }
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not get canvas context");

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current frame
      ctx.drawImage(video, 0, 0);

      // Convert to base64
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      const base64 = imageData.split(",")[1];

      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sesión expirada");
        navigate("/auth");
        return;
      }

      // Call analyze-form function
      const { data, error } = await supabase.functions.invoke("analyze-form", {
        body: { imageBase64: base64, exerciseName },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysis(data);
      
      // Speak the main issue if there's a warning or error
      const mainIssue = data.issues?.find((i: FormIssue) => i.severity !== "good");
      if (mainIssue) {
        speakFeedback(mainIssue.message);
      }

    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Error al analizar. Intenta de nuevo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const speakFeedback = async (text: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase.functions.invoke("tts-coach", {
        body: { text },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (data?.audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        audio.play();
      }
    } catch (error) {
      console.error("TTS error:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error": return "text-destructive";
      case "warning": return "text-yellow-400";
      case "good": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case "error": return "bg-destructive/20 border-destructive/50";
      case "warning": return "bg-yellow-500/20 border-yellow-500/50";
      case "good": return "bg-primary/20 border-primary/50";
      default: return "bg-muted";
    }
  };

  return (
    <MobileFrame className="overflow-hidden">
      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Overlay */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-background/80 to-transparent">
        <button
          onClick={() => {
            stopCamera();
            navigate("/training");
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 backdrop-blur-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-bold uppercase tracking-widest text-secondary">
            Visión IA
          </h1>
          <p className="text-xs text-muted-foreground">{exerciseName}</p>
        </div>
        <button
          onClick={switchCamera}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 backdrop-blur-sm"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </header>

      {/* Main Viewfinder */}
      <main className="relative flex-1 bg-background flex items-center justify-center overflow-hidden">
        {isStreaming ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6">
            {cameraError ? (
              <>
                <CameraOff className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
                >
                  Reintentar
                </button>
              </>
            ) : (
              <>
                <Camera className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  Activa la cámara para analizar tu forma
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  Posiciónate de perfil para mejor análisis
                </p>
                <button
                  onClick={startCamera}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Activar Cámara
                </button>
              </>
            )}
          </div>
        )}

        {/* Recording Indicator */}
        {isStreaming && (
          <div className="absolute top-20 left-4 flex items-center gap-2 bg-destructive/80 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-foreground rounded-full animate-pulse" />
            <span className="text-xs font-bold text-foreground">EN VIVO</span>
          </div>
        )}

        {/* Score Overlay */}
        {analysis && isStreaming && (
          <div className="absolute top-20 right-4 glass-card px-3 py-2">
            <p className="text-xs text-muted-foreground">Forma</p>
            <p className={`text-2xl font-mono font-bold ${
              analysis.overallScore >= 80 ? "text-primary" : 
              analysis.overallScore >= 60 ? "text-yellow-400" : "text-destructive"
            }`}>
              {analysis.overallScore}%
            </p>
          </div>
        )}

        {/* Analyze Button */}
        {isStreaming && (
          <button
            onClick={captureAndAnalyze}
            disabled={isAnalyzing}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/50 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
            ) : (
              <Camera className="w-8 h-8 text-primary-foreground" />
            )}
          </button>
        )}
      </main>

      {/* Bottom Feedback Panel */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="absolute bottom-0 left-0 right-0 glass-panel border-t border-white/10 p-4 space-y-4 max-h-[40vh] overflow-y-auto"
          >
            {/* Issues */}
            {analysis.issues.map((issue, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className={`flex items-start gap-3 ${getSeverityBg(issue.severity)}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    issue.severity === "good" ? "bg-primary/20" : 
                    issue.severity === "error" ? "bg-destructive/20" : "bg-yellow-500/20"
                  }`}>
                    {issue.severity === "good" ? (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    ) : issue.severity === "error" ? (
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    ) : (
                      <Info className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${getSeverityColor(issue.severity)}`}>
                      {issue.bodyPart}: {issue.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {issue.correction}
                    </p>
                    {issue.angle && issue.idealAngle && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Ángulo: {issue.angle}° (ideal: {issue.idealAngle}°)
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => speakFeedback(issue.correction)}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                  </button>
                </GlassCard>
              </motion.div>
            ))}

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <GlassCard className="text-center py-2">
                <p className={`text-lg font-bold ${
                  analysis.overallScore >= 80 ? "text-primary" : 
                  analysis.overallScore >= 60 ? "text-yellow-400" : "text-destructive"
                }`}>
                  {analysis.overallScore}%
                </p>
                <p className="text-[10px] text-muted-foreground">Forma general</p>
              </GlassCard>
              <GlassCard className="text-center py-2">
                <p className="text-lg font-bold">{analysis.tempo}s</p>
                <p className="text-[10px] text-muted-foreground">Tempo</p>
              </GlassCard>
              <GlassCard className={`text-center py-2 ${
                analysis.depthScore === "Excelente" || analysis.depthScore === "Bueno" 
                  ? "border-primary/30" 
                  : ""
              }`}>
                <p className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                  {analysis.depthScore === "Excelente" || analysis.depthScore === "Bueno" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : null}
                  {analysis.depthScore}
                </p>
                <p className="text-[10px] text-muted-foreground">Profundidad</p>
              </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial instructions when no analysis */}
      {isStreaming && !analysis && !isAnalyzing && (
        <div className="absolute bottom-4 left-4 right-4 glass-card text-center py-3">
          <p className="text-sm text-muted-foreground">
            Posiciónate de perfil y toca el botón para analizar tu forma
          </p>
        </div>
      )}
    </MobileFrame>
  );
}