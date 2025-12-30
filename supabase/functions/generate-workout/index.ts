import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const goal = profile?.goal || "ganar_musculo";
    const experienceLevel = profile?.experience_level || "intermedio";

    console.log(`Generating workout for user ${user.id}, goal: ${goal}, level: ${experienceLevel}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Eres un entrenador personal experto. Genera rutinas de entrenamiento personalizadas en español.
El usuario tiene el objetivo de "${goal}" y su nivel de experiencia es "${experienceLevel}".
Debes generar una rutina de entrenamiento adaptada a su perfil.`;

    const userPrompt = `Genera una rutina de entrenamiento para hoy. La rutina debe incluir:
- Un nombre descriptivo para la rutina
- Una breve descripción
- Los grupos musculares objetivo
- Un estimado de duración en minutos
- Una lista de 4-6 ejercicios con: nombre, sets, reps, peso sugerido (si aplica), tiempo de descanso en segundos, y notas opcionales.

El nivel del usuario es ${experienceLevel} y su objetivo es ${goal}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_workout_routine",
              description: "Crea una rutina de entrenamiento personalizada",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nombre de la rutina" },
                  description: { type: "string", description: "Descripción breve de la rutina" },
                  target_muscle_groups: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Grupos musculares objetivo" 
                  },
                  estimated_duration_minutes: { type: "number", description: "Duración estimada en minutos" },
                  difficulty_level: { 
                    type: "string", 
                    enum: ["beginner", "intermediate", "advanced"],
                    description: "Nivel de dificultad" 
                  },
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        sets: { type: "number" },
                        reps: { type: "string" },
                        weight_suggestion: { type: "string" },
                        rest_seconds: { type: "number" },
                        notes: { type: "string" }
                      },
                      required: ["name", "sets", "reps", "rest_seconds"]
                    }
                  }
                },
                required: ["name", "description", "target_muscle_groups", "estimated_duration_minutes", "difficulty_level", "exercises"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_workout_routine" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido, intenta de nuevo más tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Se requiere pago, añade fondos a tu cuenta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response received:", JSON.stringify(aiResponse));

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_workout_routine") {
      throw new Error("Invalid AI response format");
    }

    const workoutData = JSON.parse(toolCall.function.arguments);
    console.log("Parsed workout data:", JSON.stringify(workoutData));

    // Map difficulty level
    const difficultyMap: Record<string, string> = {
      "beginner": "principiante",
      "intermediate": "intermedio", 
      "advanced": "avanzado"
    };

    // Save routine to database
    const { data: routine, error: routineError } = await supabaseClient
      .from("workout_routines")
      .insert({
        user_id: user.id,
        name: workoutData.name,
        description: workoutData.description,
        target_muscle_groups: workoutData.target_muscle_groups,
        difficulty_level: difficultyMap[workoutData.difficulty_level] || workoutData.difficulty_level,
        estimated_duration_minutes: workoutData.estimated_duration_minutes,
        generated_by_ai: true,
        is_active: true
      })
      .select()
      .single();

    if (routineError) {
      console.error("Error saving routine:", routineError);
      throw routineError;
    }

    console.log("Routine saved:", routine.id);

    // Save exercises
    const exercisesWithOrder = workoutData.exercises.map((exercise: any, index: number) => ({
      routine_id: routine.id,
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      weight_suggestion: exercise.weight_suggestion || null,
      rest_seconds: exercise.rest_seconds,
      notes: exercise.notes || null,
      order_index: index
    }));

    const { error: exercisesError } = await supabaseClient
      .from("routine_exercises")
      .insert(exercisesWithOrder);

    if (exercisesError) {
      console.error("Error saving exercises:", exercisesError);
      throw exercisesError;
    }

    console.log("Exercises saved successfully");

    // Fetch complete routine with exercises
    const { data: completeRoutine } = await supabaseClient
      .from("workout_routines")
      .select(`
        *,
        routine_exercises (*)
      `)
      .eq("id", routine.id)
      .single();

    return new Response(JSON.stringify({ routine: completeRoutine }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-workout function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
