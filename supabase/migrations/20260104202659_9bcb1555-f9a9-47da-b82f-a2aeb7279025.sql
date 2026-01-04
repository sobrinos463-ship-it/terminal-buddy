-- Add DELETE policy for workout_sessions (only incomplete sessions)
CREATE POLICY "Users can delete own incomplete sessions"
ON workout_sessions FOR DELETE
USING (auth.uid() = user_id AND completed_at IS NULL);