-- Índices para optimizar queries frecuentes y soportar millones de usuarios

-- Índice para buscar rutinas activas por usuario (usado en Dashboard y Training)
CREATE INDEX IF NOT EXISTS idx_workout_routines_user_active 
ON workout_routines(user_id, is_active) 
WHERE is_active = true;

-- Índice para buscar sesiones por usuario ordenadas por fecha (usado en Dashboard y Chat)
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_completed 
ON workout_sessions(user_id, completed_at DESC) 
WHERE completed_at IS NOT NULL;

-- Índice para buscar ejercicios de una rutina ordenados
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_order 
ON routine_exercises(routine_id, order_index);

-- Índice para buscar sets completados por sesión
CREATE INDEX IF NOT EXISTS idx_completed_sets_session 
ON completed_sets(session_id, set_number);

-- Índice para buscar perfil por user_id (muy frecuente)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);