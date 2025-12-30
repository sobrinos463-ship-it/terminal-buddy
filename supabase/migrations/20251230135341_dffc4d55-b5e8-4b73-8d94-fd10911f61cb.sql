-- Tabla para rutinas de entrenamiento generadas por IA
CREATE TABLE public.workout_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_muscle_groups TEXT[] NOT NULL DEFAULT '{}',
  difficulty_level TEXT NOT NULL DEFAULT 'intermediate',
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 45,
  is_active BOOLEAN NOT NULL DEFAULT true,
  generated_by_ai BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para ejercicios dentro de una rutina
CREATE TABLE public.routine_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID NOT NULL REFERENCES public.workout_routines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps TEXT NOT NULL DEFAULT '10-12',
  weight_suggestion TEXT,
  rest_seconds INTEGER NOT NULL DEFAULT 90,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para sesiones de entrenamiento completadas
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_id UUID REFERENCES public.workout_routines(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

-- Tabla para sets completados en una sesión
CREATE TABLE public.completed_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps_completed INTEGER,
  weight_used TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_sets ENABLE ROW LEVEL SECURITY;

-- RLS para workout_routines
CREATE POLICY "Users can view own routines" ON public.workout_routines 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own routines" ON public.workout_routines 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routines" ON public.workout_routines 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own routines" ON public.workout_routines 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS para routine_exercises (via routine ownership)
CREATE POLICY "Users can view exercises of own routines" ON public.routine_exercises 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workout_routines WHERE id = routine_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can create exercises for own routines" ON public.routine_exercises 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workout_routines WHERE id = routine_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update exercises of own routines" ON public.routine_exercises 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workout_routines WHERE id = routine_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete exercises of own routines" ON public.routine_exercises 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workout_routines WHERE id = routine_id AND user_id = auth.uid())
  );

-- RLS para workout_sessions
CREATE POLICY "Users can view own sessions" ON public.workout_sessions 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.workout_sessions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.workout_sessions 
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS para completed_sets (via session ownership)
CREATE POLICY "Users can view own completed sets" ON public.completed_sets 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workout_sessions WHERE id = session_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can create completed sets for own sessions" ON public.completed_sets 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workout_sessions WHERE id = session_id AND user_id = auth.uid())
  );

-- Triggers para updated_at
CREATE TRIGGER update_workout_routines_updated_at
  BEFORE UPDATE ON public.workout_routines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();