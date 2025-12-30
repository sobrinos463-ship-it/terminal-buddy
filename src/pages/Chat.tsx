import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Send, Mic, MicOff, Sparkles, Volume2, VolumeX, Loader2 } from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";
import { BottomNav } from "@/components/layout/BottomNav";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: number;
  role: "assistant" | "user";
  content: string;
  suggestions?: string[];
}

interface UserContext {
  profile: {
    full_name: string | null;
    goal: string | null;
    experience_level: string | null;
    streak_days: number;
    total_xp: number;
  } | null;
  currentRoutine: {
    name: string;
    target_muscle_groups: string[];
    exercises: { name: string; sets: number; reps: string }[];
  } | null;
  lastSession: {
    completed_at: string;
    duration_seconds: number;
    xp_earned: number;
  } | null;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

export default function Chat() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    isRecording, 
    isTranscribing, 
    startRecording, 
    stopRecording, 
    playAudio, 
    isPlayingAudio,
    stopAudio 
  } = useVoiceChat();

  // Load user context on mount
  useEffect(() => {
    const loadContext = async () => {
      if (!user) return;

      try {
        // Get profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, goal, experience_level, streak_days, total_xp")
          .eq("user_id", user.id)
          .maybeSingle();

        // Get current routine with exercises
        const { data: routines } = await supabase
          .from("workout_routines")
          .select(`
            name,
            target_muscle_groups,
            routine_exercises (name, sets, reps)
          `)
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        // Get last workout session
        const { data: sessions } = await supabase
          .from("workout_sessions")
          .select("completed_at, duration_seconds, xp_earned")
          .eq("user_id", user.id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1);

        const context: UserContext = {
          profile: profile || null,
          currentRoutine: routines && routines[0] ? {
            name: routines[0].name,
            target_muscle_groups: routines[0].target_muscle_groups,
            exercises: routines[0].routine_exercises || []
          } : null,
          lastSession: sessions && sessions[0] ? sessions[0] : null
        };

        setUserContext(context);

        // Set initial greeting based on context
        const firstName = profile?.full_name?.split(" ")[0] || "máquina";
        const goalText = {
          lose_fat: "perder grasa",
          build_muscle: "ganar músculo",
          strength: "ganar fuerza",
          endurance: "mejorar resistencia",
          maintain: "mantenerte"
        }[profile?.goal || ""] || "entrenar";

        setMessages([{
          id: 1,
          role: "assistant",
          content: `¡${firstName}! ¿Qué necesitas?`,
          suggestions: context.currentRoutine 
            ? ["Entrenar hoy", "Cambiar rutina", "Ver mi progreso"]
            : ["Generar mi rutina", "Consejo de entrenamiento"]
        }]);

      } catch (error) {
        console.error("Error loading context:", error);
      } finally {
        setContextLoaded(true);
      }
    };

    loadContext();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: userMessage,
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    let assistantContent = "";
    const assistantId = Date.now() + 1;

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
          userContext: userContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      // Create assistant message
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {
            // Partial JSON, continue
          }
        }
      }

      // Auto-play voice response
      if (autoPlayVoice && assistantContent.length > 0) {
        playAudio(assistantContent);
      }

    } catch (error) {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error al conectar con el Coach IA",
      });
      // Remove failed assistant message
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (text?: string) => {
    const messageText = text || inputValue;
    if (!messageText.trim() || isLoading) return;
    setInputValue("");
    streamChat(messageText);
  };

  const handleVoiceButton = async () => {
    if (isRecording) {
      const transcribedText = await stopRecording();
      if (transcribedText && transcribedText.trim()) {
        streamChat(transcribedText);
      } else if (transcribedText === null) {
        toast({
          variant: "destructive",
          title: "Error de voz",
          description: "No se pudo transcribir el audio. Intenta de nuevo.",
        });
      }
    } else {
      try {
        await startRecording();
      } catch {
        toast({
          variant: "destructive",
          title: "Micrófono no disponible",
          description: "Permite el acceso al micrófono para usar voz.",
        });
      }
    }
  };

  return (
    <MobileFrame>
      {/* Header */}
      <header className="glass-panel sticky top-0 z-20 px-4 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold">Coach IA</h1>
              <p className="text-xs text-primary">
                {isLoading ? "Escribiendo..." : isPlayingAudio ? "Hablando..." : "En línea"}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => {
            setAutoPlayVoice(!autoPlayVoice);
            if (isPlayingAudio) stopAudio();
          }}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            autoPlayVoice ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"
          }`}
        >
          {autoPlayVoice ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </header>

      {/* Chat Area */}
      <MobileContent className="p-4 space-y-4 pb-40">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className={`max-w-[85%] ${message.role === "assistant" ? "flex gap-3" : ""}`}>
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <div
                    className={`px-4 py-3 ${
                      message.role === "assistant"
                        ? "bg-muted/80 rounded-2xl rounded-tl-sm border border-white/10"
                        : "bg-gradient-to-br from-secondary to-indigo-600 rounded-2xl rounded-tr-sm text-foreground shadow-lg shadow-secondary/30"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Suggestions */}
                  {message.suggestions && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion) => (
                        <motion.button
                          key={suggestion}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSend(suggestion)}
                          disabled={isLoading}
                          className="px-3 py-2 glass-card text-xs font-medium hover:bg-secondary/20 hover:border-secondary/50 transition-all disabled:opacity-50"
                        >
                          {suggestion}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading Indicator */}
        <AnimatePresence>
          {isLoading && messages[messages.length - 1]?.content === "" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted/80 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/10">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-typing" />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-typing" style={{ animationDelay: "-1.1s" }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-typing" style={{ animationDelay: "-0.9s" }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </MobileContent>

      {/* Input Area */}
      <div className="absolute bottom-16 left-0 right-0 glass-panel border-t border-white/10 p-4">
        <div className="flex gap-3">
          <button 
            onClick={handleVoiceButton}
            disabled={isTranscribing || isLoading}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isRecording 
                ? "bg-red-500 text-white animate-pulse" 
                : isTranscribing
                  ? "bg-muted text-muted-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={isRecording ? "Escuchando..." : "Pregunta a tu Coach..."}
            disabled={isLoading || isRecording}
            className="flex-1 bg-muted/50 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !inputValue.trim()}
            className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {isRecording && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 text-center"
          >
            <p className="text-xs text-red-400 animate-pulse">🎙️ Grabando... Toca el micrófono para enviar</p>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </MobileFrame>
  );
}
