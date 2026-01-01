import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Dumbbell,
  Search,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

interface Exercise {
  name: string;
  muscleGroup: string;
}

interface SelectedExercise {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
}

interface ExerciseSelectorProps {
  onConfirm: (exercises: SelectedExercise[]) => void;
  onBack: () => void;
}

const EXERCISE_DATABASE: Record<string, string[]> = {
  "Pecho": [
    "Press banca",
    "Press inclinado mancuernas",
    "Aperturas con mancuernas",
    "Fondos en paralelas",
    "Press declinado",
    "Pullover",
    "Cruces en polea",
    "Flexiones",
  ],
  "Espalda": [
    "Dominadas",
    "Remo con barra",
    "Remo con mancuerna",
    "Jalón al pecho",
    "Remo en polea baja",
    "Peso muerto",
    "Pull-ups",
    "Face pulls",
  ],
  "Hombros": [
    "Press militar",
    "Elevaciones laterales",
    "Elevaciones frontales",
    "Pájaros",
    "Press Arnold",
    "Encogimientos",
    "Remo al mentón",
  ],
  "Bíceps": [
    "Curl con barra",
    "Curl alterno mancuernas",
    "Curl martillo",
    "Curl concentrado",
    "Curl predicador",
    "Curl en polea",
    "Curl 21s",
  ],
  "Tríceps": [
    "Press francés",
    "Extensiones en polea",
    "Fondos en banco",
    "Patada de tríceps",
    "Press cerrado",
    "Extensiones sobre cabeza",
    "Dips en máquina",
  ],
  "Piernas": [
    "Sentadilla",
    "Prensa",
    "Extensión de cuádriceps",
    "Curl femoral",
    "Zancadas",
    "Peso muerto rumano",
    "Hip thrust",
    "Sentadilla búlgara",
    "Elevación de gemelos",
  ],
  "Core": [
    "Plancha",
    "Crunch",
    "Russian twists",
    "Elevación de piernas",
    "Ab wheel",
    "Mountain climbers",
    "Plancha lateral",
    "Dead bug",
  ],
  "Cardio": [
    "Cinta de correr",
    "Bicicleta estática",
    "Elíptica",
    "Remo ergómetro",
    "Saltar cuerda",
    "Burpees",
    "Jumping jacks",
    "Sprint en cinta",
  ],
};

const MUSCLE_ICONS: Record<string, string> = {
  "Pecho": "💪",
  "Espalda": "🔙",
  "Hombros": "🎯",
  "Bíceps": "💪",
  "Tríceps": "💪",
  "Piernas": "🦵",
  "Core": "🔥",
  "Cardio": "❤️",
};

const MUSCLE_COLORS: Record<string, string> = {
  "Pecho": "from-red-500 to-rose-600",
  "Espalda": "from-blue-500 to-indigo-600",
  "Hombros": "from-orange-500 to-amber-600",
  "Bíceps": "from-purple-500 to-violet-600",
  "Tríceps": "from-pink-500 to-fuchsia-600",
  "Piernas": "from-emerald-500 to-teal-600",
  "Core": "from-yellow-500 to-orange-600",
  "Cardio": "from-cyan-500 to-blue-600",
};

export function ExerciseSelector({ onConfirm, onBack }: ExerciseSelectorProps) {
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [expandedMuscle, setExpandedMuscle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleExercise = (exerciseName: string, muscleGroup: string) => {
    const exists = selectedExercises.find((e) => e.name === exerciseName);
    if (exists) {
      setSelectedExercises((prev) => prev.filter((e) => e.name !== exerciseName));
    } else {
      setSelectedExercises((prev) => [
        ...prev,
        { name: exerciseName, muscleGroup, sets: 3, reps: "12" },
      ]);
    }
  };

  const isSelected = (exerciseName: string) =>
    selectedExercises.some((e) => e.name === exerciseName);

  const filteredExercises = Object.entries(EXERCISE_DATABASE).reduce(
    (acc, [muscle, exercises]) => {
      if (searchQuery.trim()) {
        const filtered = exercises.filter((ex) =>
          ex.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[muscle] = filtered;
        }
      } else {
        acc[muscle] = exercises;
      }
      return acc;
    },
    {} as Record<string, string[]>
  );

  const handleConfirm = () => {
    if (selectedExercises.length === 0) return;
    onConfirm(selectedExercises);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-20 p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="ml-2">
              <h1 className="text-lg font-bold">Selecciona Ejercicios</h1>
              <p className="text-xs text-muted-foreground">
                {selectedExercises.length} ejercicio{selectedExercises.length !== 1 ? "s" : ""} seleccionado{selectedExercises.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ejercicio..."
            className="w-full bg-muted/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
        {/* Selected exercises preview */}
        {selectedExercises.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
              Seleccionados
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedExercises.map((ex) => (
                <motion.button
                  key={ex.name}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={() => toggleExercise(ex.name, ex.muscleGroup)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary rounded-full text-xs font-medium border border-primary/30"
                >
                  <span>{ex.name}</span>
                  <span className="w-4 h-4 rounded-full bg-primary/30 flex items-center justify-center">
                    ×
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Muscle Groups */}
        {Object.entries(filteredExercises).map(([muscleGroup, exercises]) => (
          <GlassCard key={muscleGroup} className="overflow-hidden p-0">
            <button
              onClick={() =>
                setExpandedMuscle(expandedMuscle === muscleGroup ? null : muscleGroup)
              }
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${MUSCLE_COLORS[muscleGroup]} flex items-center justify-center text-lg`}
                >
                  {MUSCLE_ICONS[muscleGroup]}
                </div>
                <div className="text-left">
                  <p className="font-bold">{muscleGroup}</p>
                  <p className="text-xs text-muted-foreground">
                    {exercises.length} ejercicios
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedExercises.filter((e) => e.muscleGroup === muscleGroup).length > 0 && (
                  <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs font-bold">
                    {selectedExercises.filter((e) => e.muscleGroup === muscleGroup).length}
                  </span>
                )}
                <motion.div
                  animate={{ rotate: expandedMuscle === muscleGroup ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </div>
            </button>

            <AnimatePresence>
              {expandedMuscle === muscleGroup && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                    {exercises.map((exercise) => (
                      <motion.button
                        key={exercise}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleExercise(exercise, muscleGroup)}
                        className={`p-3 rounded-xl text-left transition-all ${
                          isSelected(exercise)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{exercise}</span>
                          {isSelected(exercise) && (
                            <Check className="w-4 h-4" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        ))}

        {Object.keys(filteredExercises).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No se encontraron ejercicios</p>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-md mx-auto">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            disabled={selectedExercises.length === 0}
            className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-2xl font-bold text-lg shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            <Dumbbell className="w-5 h-5" />
            Comenzar con {selectedExercises.length} ejercicio{selectedExercises.length !== 1 ? "s" : ""}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
