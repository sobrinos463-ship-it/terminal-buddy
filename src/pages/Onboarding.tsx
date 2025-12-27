import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Send } from "lucide-react";
import { MobileFrame, MobileContent } from "@/components/layout/MobileFrame";

interface Message {
  id: number;
  type: "ai" | "user";
  content: string;
  options?: string[];
}

const initialMessages: Message[] = [
  {
    id: 1,
    type: "ai",
    content:
      "¡Hola! 👋 Soy tu Coach de IA. Vamos a conocernos un poco para crear el plan perfecto para ti.",
  },
  {
    id: 2,
    type: "ai",
    content: "¿Cuál es tu objetivo principal?",
    options: [
      "Perder grasa",
      "Ganar músculo",
      "Mejorar resistencia",
      "Mantenerme activo",
    ],
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [progress, setProgress] = useState(25);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleOptionSelect = (option: string) => {
    const userMessage: Message = {
      id: messages.length + 1,
      type: "user",
      content: option,
    };
    setMessages([...messages, userMessage]);
    setIsTyping(true);
    setProgress(Math.min(progress + 25, 100));

    setTimeout(() => {
      setIsTyping(false);
      const nextQuestion = getNextQuestion(messages.length);
      if (nextQuestion) {
        setMessages((prev) => [...prev, nextQuestion]);
      } else {
        navigate("/plan-generation");
      }
    }, 1500);
  };

  const getNextQuestion = (msgCount: number): Message | null => {
    const questions: Message[] = [
      {
        id: msgCount + 2,
        type: "ai",
        content: "Excelente elección. ¿Cuántos días a la semana puedes entrenar?",
        options: ["2-3 días", "4-5 días", "6+ días"],
      },
      {
        id: msgCount + 2,
        type: "ai",
        content: "¿Cuál es tu nivel de experiencia en el gimnasio?",
        options: ["Principiante", "Intermedio", "Avanzado"],
      },
      {
        id: msgCount + 2,
        type: "ai",
        content:
          "¡Perfecto! Ya tengo toda la información que necesito. Voy a crear tu plan personalizado ahora mismo. 🚀",
      },
    ];

    const index = Math.floor((msgCount - 2) / 2);
    return index < questions.length ? questions[index] : null;
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
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
              Entrevista Inicial
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
                {message.options && (
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
          {isTyping && (
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
            className="flex-1 bg-muted/50 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
          />
          <button
            onClick={handleSend}
            className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </MobileFrame>
  );
}