import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Send, Loader2 } from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  type: "ai" | "user";
  content: string;
  options?: string[];
}

interface OnboardingData {
  goal: string | null;
  experience_level: string | null;
  training_days: string | null;
}

const goalMap: Record<string, string> = {
  "Perder grasa": "lose_fat",
  "Ganar músculo": "build_muscle",
  "Mejorar resistencia": "endurance",
  "Mantenerme activo": "maintain",
  "Ganar fuerza": "strength",
};

const levelMap: Record<string, string> = {
  "Principiante": "beginner",
  "Intermedio": "intermediate",
  "Avanzado": "advanced",
  "Elite": "elite",
};

const initialMessages: Message[] = [
  {
    id: 1,
    type: "ai",
    content: "¡Qué pasa, máquina! 💪 Soy tu Coach IA. Vamos a conocernos para crear el plan perfecto para ti.",
  },
  {
    id: 2,
    type: "ai",
    content: "¿Cuál es tu objetivo principal?",
    options: ["Perder grasa", "Ganar músculo", "Ganar fuerza", "Mejorar resistencia"],
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [progress, setProgress] = useState(25);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    goal: null,
    experience_level: null,
    training_days: null,
  });
  const [questionIndex, setQuestionIndex] = useState(0);

  const saveProfile = async (data: OnboardingData) => {
    if (!user) {
      console.error("No user found for saving profile");
      return;
    }
    
    console.log("Saving profile with data:", data);
    setIsSaving(true);
    try {
      const updateData = {
        goal: data.goal,
        experience_level: data.experience_level,
      };
      console.log("Update payload:", updateData, "User ID:", user.id);
      
      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Profile updated successfully:", updatedProfile);

      toast({
        title: "¡Perfil guardado!",
        description: "Tu plan personalizado está listo.",
      });
      navigate("/plan-generation");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar tu perfil.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    const userMessage: Message = {
      id: messages.length + 1,
      type: "user",
      content: option,
    };
    setMessages([...messages, userMessage]);
    setIsTyping(true);

    // Update onboarding data based on question index
    const newData = { ...onboardingData };
    if (questionIndex === 0) {
      newData.goal = goalMap[option] || option.toLowerCase().replace(/\s+/g, '_');
    } else if (questionIndex === 1) {
      newData.training_days = option;
    } else if (questionIndex === 2) {
      newData.experience_level = levelMap[option] || "beginner";
    }
    setOnboardingData(newData);
    setQuestionIndex(questionIndex + 1);
    console.log("Onboarding data updated:", newData, "Question:", questionIndex + 1);
    setProgress(Math.min(progress + 25, 100));

    setTimeout(() => {
      setIsTyping(false);
      const nextQuestion = getNextQuestion(questionIndex + 1, newData);
      if (nextQuestion) {
        setMessages((prev) => [...prev, nextQuestion]);
      }
    }, 1200);
  };

  const getNextQuestion = (index: number, data: OnboardingData): Message | null => {
    const questions: Message[] = [
      {
        id: messages.length + 2,
        type: "ai",
        content: "Perfecto. ¿Cuántos días a la semana puedes entrenar?",
        options: ["2-3 días", "4-5 días", "6+ días"],
      },
      {
        id: messages.length + 2,
        type: "ai",
        content: "¿Cuál es tu nivel de experiencia en el gimnasio?",
        options: ["Principiante", "Intermedio", "Avanzado"],
      },
      {
        id: messages.length + 2,
        type: "ai",
        content: "¡Brutal! Ya tengo todo lo que necesito. Voy a crear tu plan personalizado ahora mismo. 🔥",
      },
    ];

    // If we still have questions to show
    if (index < questions.length) {
      return questions[index];
    }
    
    // All questions answered - show final message and save
    if (index === questions.length) {
      console.log("All questions answered, saving profile with data:", data);
      // Save profile after showing the final message
      setTimeout(() => {
        if (data.goal && data.experience_level) {
          saveProfile(data);
        } else {
          console.error("Missing goal or experience_level in data:", data);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Faltan datos. Por favor, vuelve a intentarlo.",
          });
        }
      }, 2000);
      return questions[2]; // Show final message
    }
    
    return null;
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    handleOptionSelect(inputValue);
    setInputValue("");
  };

  return (
    <MobileFrame>
      {/* Header */}
      <header className="glass-panel sticky top-0 z-20 p-4 flex items-center gap-4 border-b border-white/10">
        <button
          onClick={() => navigate("/auth")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Configuración Inicial
            </span>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-secondary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <MobileContent className="p-4 space-y-4 pb-24">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="max-w-[85%]">
                <div
                  className={`px-4 py-3 ${
                    message.type === "ai"
                      ? "bg-muted/80 rounded-2xl rounded-bl-sm border border-white/10"
                      : "bg-gradient-to-br from-secondary to-indigo-600 rounded-2xl rounded-br-sm text-secondary-foreground shadow-lg shadow-secondary/30"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>

                {/* Options */}
                {message.options && !isSaving && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.options.map((option) => (
                      <motion.button
                        key={option}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleOptionSelect(option)}
                        className="px-4 py-2 glass-card text-sm font-medium hover:bg-secondary/20 hover:border-secondary/50 transition-all"
                      >
                        {option}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {(isTyping || isSaving) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="bg-muted/80 rounded-2xl rounded-bl-sm px-4 py-3 border border-white/10">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-typing" />
                  <span
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-typing"
                    style={{ animationDelay: "-1.1s" }}
                  />
                  <span
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-typing"
                    style={{ animationDelay: "-0.9s" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </MobileContent>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 glass-panel border-t border-white/10 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escribe tu respuesta..."
            disabled={isSaving}
            className="flex-1 bg-muted/50 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isSaving}
            className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </MobileFrame>
  );
}
