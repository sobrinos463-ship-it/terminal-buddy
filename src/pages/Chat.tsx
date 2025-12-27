import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Send, Mic, Sparkles } from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";
import { BottomNav } from "@/components/layout/BottomNav";

interface Message {
  id: number;
  type: "ai" | "user";
  content: string;
  suggestions?: string[];
}

const initialMessages: Message[] = [
  {
    id: 1,
    type: "ai",
    content:
      "¡Hola Alex! 👋 Acabo de analizar tu última sesión. Completaste un 95% del volumen planificado. ¿En qué puedo ayudarte hoy?",
    suggestions: [
      "¿Cómo puedo mejorar mi press banca?",
      "Ajusta mi plan de hoy",
      "Explícame mi progreso",
    ],
  },
];

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (text?: string) => {
    const messageText = text || inputValue;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      type: "user",
      content: messageText,
    };
    setMessages([...messages, userMessage]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const aiResponse: Message = {
        id: messages.length + 2,
        type: "ai",
        content: getAIResponse(messageText),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1500);
  };

  const getAIResponse = (userMessage: string): string => {
    if (userMessage.toLowerCase().includes("press banca")) {
      return "Para mejorar tu press banca, te recomiendo enfocarte en: 1) Retracción escapular constante, 2) Arco lumbar controlado, 3) Grip ancho para más activación pectoral. Basándome en tus datos, podrías aumentar 5kg en las próximas 2 semanas si mantienes la consistencia. 💪";
    }
    if (userMessage.toLowerCase().includes("plan")) {
      return "He revisado tu estado actual. Considerando tu sueño de anoche (6.5h) y la sesión intensa de ayer, sugiero reducir el volumen un 15% hoy. ¿Quieres que aplique este ajuste automáticamente?";
    }
    return "Entendido. He analizado tu solicitud y estoy procesando la mejor recomendación basada en tu historial de entrenamiento y objetivos. ¿Hay algo más específico que te gustaría saber?";
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
              <img
                src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=100&h=100&fit=crop"
                alt="Coach AI"
                className="w-10 h-10 rounded-full border-2 border-primary object-cover"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
            </div>
            <div>
              <h1 className="font-bold">Coach IA</h1>
              <p className="text-xs text-primary">En línea • Analizando</p>
            </div>
          </div>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary/20 text-secondary">
          <Sparkles className="w-5 h-5" />
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
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className={`max-w-[85%] ${message.type === "ai" ? "flex gap-3" : ""}`}>
                {message.type === "ai" && (
                  <img
                    src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=100&h=100&fit=crop"
                    alt="AI"
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                )}
                <div>
                  <div
                    className={`px-4 py-3 ${
                      message.type === "ai"
                        ? "bg-muted/80 rounded-2xl rounded-tl-sm border border-white/10"
                        : "bg-gradient-to-br from-secondary to-indigo-600 rounded-2xl rounded-tr-sm text-foreground shadow-lg shadow-secondary/30"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
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
                          className="px-3 py-2 glass-card text-xs font-medium hover:bg-secondary/20 hover:border-secondary/50 transition-all"
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

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="flex gap-3">
                <img
                  src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=100&h=100&fit=crop"
                  alt="AI"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="bg-muted/80 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/10">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </MobileContent>

      {/* Input Area */}
      <div className="absolute bottom-16 left-0 right-0 glass-panel border-t border-white/10 p-4">
        <div className="flex gap-3">
          <button className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Mic className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Pregunta a tu Coach..."
            className="flex-1 bg-muted/50 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
          />
          <button
            onClick={() => handleSend()}
            className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      <BottomNav />
    </MobileFrame>
  );
}