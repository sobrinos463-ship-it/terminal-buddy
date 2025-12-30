import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Dumbbell, Flame, Heart, Zap, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoal: string | null;
  currentLevel: string | null;
  userId: string;
  onUpdate: () => void;
}

const goals = [
  { id: "lose_fat", label: "Perder grasa", icon: Flame, description: "Quemar grasa y definir" },
  { id: "build_muscle", label: "Ganar músculo", icon: Dumbbell, description: "Hipertrofia y volumen" },
  { id: "strength", label: "Ganar fuerza", icon: Zap, description: "Fuerza máxima y potencia" },
  { id: "endurance", label: "Resistencia", icon: Heart, description: "Cardio y aguante" },
  { id: "maintain", label: "Mantenerme", icon: Target, description: "Conservar forma actual" },
];

const levels = [
  { id: "beginner", label: "Principiante", description: "Menos de 1 año" },
  { id: "intermediate", label: "Intermedio", description: "1-3 años" },
  { id: "advanced", label: "Avanzado", description: "3+ años" },
];

export function EditGoalModal({ isOpen, onClose, currentGoal, currentLevel, userId, onUpdate }: EditGoalModalProps) {
  const [selectedGoal, setSelectedGoal] = useState(currentGoal || "build_muscle");
  const [selectedLevel, setSelectedLevel] = useState(currentLevel || "intermediate");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          goal: selectedGoal,
          experience_level: selectedLevel,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Objetivo actualizado");
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating goal:", error);
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-card border border-border rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Cambiar Objetivo</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Goals */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3">¿Cuál es tu objetivo?</p>
              <div className="space-y-2">
                {goals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      selectedGoal === goal.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedGoal === goal.id ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <goal.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">{goal.label}</p>
                      <p className="text-xs text-muted-foreground">{goal.description}</p>
                    </div>
                    {selectedGoal === goal.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Levels */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3">Tu nivel de experiencia</p>
              <div className="grid grid-cols-3 gap-2">
                {levels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevel(level.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedLevel === level.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-semibold text-sm">{level.label}</p>
                    <p className="text-xs text-muted-foreground">{level.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Al cambiar tu objetivo, la IA generará nuevas rutinas adaptadas.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}