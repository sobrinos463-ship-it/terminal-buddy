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
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    console.log("Profile data:", JSON.stringify(profile));

    // Map Spanish goals to English for better AI understanding
    const goalMapping: Record<string, string> = {
      "lose_fat": "perder grasa corporal",
      "build_muscle": "ganar masa muscular",
      "strength": "ganar fuerza",
      "endurance": "mejorar resistencia cardiovascular",
      "maintain": "mantener forma física actual"
    };

    const levelMapping: Record<string, string> = {
      "beginner": "principiante",
      "intermediate": "intermedio",
      "advanced": "avanzado",
      "elite": "elite"
    };

    const goal = profile?.goal ? (goalMapping[profile.goal] || profile.goal) : "ganar masa muscular";
    const experienceLevel = profile?.experience_level ? (levelMapping[profile.experience_level] || profile.experience_level) : "intermedio";
    const userWeight = profile?.weight_kg || 70; // Default to 70kg if not set

    console.log(`Generating workout for user ${user.id}, goal: ${goal}, level: ${experienceLevel}, weight: ${userWeight}kg`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Define rep ranges based on goal
    const repRanges: Record<string, string> = {
      "perder grasa corporal": "12-15 reps (volumen alto, peso moderado)",
      "ganar masa muscular": "8-12 reps (hipertrofia)",
      "ganar fuerza": "4-6 reps (peso alto)",
      "mejorar resistencia cardiovascular": "15-20 reps (peso ligero)",
      "mantener forma física actual": "10-12 reps (peso moderado)"
    };

    // Weight multipliers based on experience level (as percentage of body weight for compound movements)
    const weightGuide: Record<string, string> = {
      "principiante": `Pesos BAJOS para aprender técnica. Press banca: 15-25kg, Sentadilla: 15-30kg, Peso muerto: 20-30kg, Mancuernas: 4-8kg`,
      "intermedio": `Pesos MODERADOS. Press banca: 40-60kg, Sentadilla: 50-80kg, Peso muerto: 60-90kg, Mancuernas: 10-16kg`,
      "avanzado": `Pesos ALTOS. Press banca: 70-100kg, Sentadilla: 90-120kg, Peso muerto: 100-140kg, Mancuernas: 16-24kg`,
      "elite": `Pesos MUY ALTOS. Press banca: 100-140kg, Sentadilla: 140-180kg, Peso muerto: 160-200kg, Mancuernas: 24-36kg`
    };

    const systemPrompt = `Eres un entrenador personal experto. Genera rutinas de entrenamiento personalizadas en español.

DATOS DEL USUARIO:
- Objetivo: ${goal}
- Nivel: ${experienceLevel}
- Peso corporal: ${userWeight}kg

GUÍA DE PESOS SEGÚN NIVEL (${experienceLevel}):
${weightGuide[experienceLevel] || weightGuide["intermedio"]}

GUÍA DE REPETICIONES SEGÚN OBJETIVO (${goal}):
${repRanges[goal] || repRanges["ganar masa muscular"]}

REGLAS CRÍTICAS:
1. Los pesos DEBEN ser REALISTAS para el nivel del usuario
2. NUNCA sugieras más de 100kg para principiantes
3. El peso sugerido debe ser un rango razonable (ej: "20-30kg", "15kg", "Sin peso")
4. Para ejercicios con peso corporal: "Sin peso" o "Peso corporal"
5. Las reps deben coincidir con el objetivo del usuario`;

    const userPrompt = `Genera una rutina de entrenamiento para hoy.

IMPORTANTE: 
- El usuario pesa ${userWeight}kg y es nivel ${experienceLevel}
- Objetivo: ${goal}
- Reps recomendadas: ${repRanges[goal] || "8-12"}

La rutina debe incluir:
- Nombre descriptivo en español
- Descripción motivadora breve
- Grupos musculares objetivo
- Duración estimada (30-60 min)
- 4-6 ejercicios con pesos REALISTAS para un ${experienceLevel}

EJEMPLOS DE PESO CORRECTO para ${experienceLevel}:
- Press de banca: ${experienceLevel === "principiante" ? "20-30kg" : experienceLevel === "intermedio" ? "50-70kg" : "80-100kg"}
- Sentadilla: ${experienceLevel === "principiante" ? "20-40kg" : experienceLevel === "intermedio" ? "60-90kg" : "100-130kg"}
- Curl de bíceps: ${experienceLevel === "principiante" ? "6-10kg" : experienceLevel === "intermedio" ? "12-18kg" : "18-25kg"}`;

    console.log("Sending request to AI gateway...");

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
    console.log("AI response received:", JSON.stringify(aiResponse).substring(0, 500));

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(aiResponse));
      throw new Error("La IA no generó una rutina válida");
    }
    
    if (toolCall.function.name !== "create_workout_routine") {
      console.error("Wrong function called:", toolCall.function.name);
      throw new Error("Formato de respuesta inválido");
    }

    let workoutData;
    try {
      workoutData = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Error parsing workout data:", parseError, toolCall.function.arguments);
      throw new Error("Error al procesar la rutina generada");
    }
    console.log("Parsed workout data:", JSON.stringify(workoutData));

    // Map difficulty level
    const difficultyMap: Record<string, string> = {
      "beginner": "principiante",
      "intermediate": "intermedio", 
      "advanced": "avanzado"
    };

    // Deactivate existing active routines for this user
    const { error: deactivateError } = await supabaseClient
      .from("workout_routines")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (deactivateError) {
      console.error("Error deactivating old routines:", deactivateError);
      // Continue anyway, this is not critical
    }

    // Save routine to database
    const { data: routine, error: routineError } = await supabaseClient
      .from("workout_routines")
      .insert({
        user_id: user.id,
        name: workoutData.name || "Rutina del día",
        description: workoutData.description || "Rutina generada por IA",
        target_muscle_groups: workoutData.target_muscle_groups || ["General"],
        difficulty_level: difficultyMap[workoutData.difficulty_level] || "intermedio",
        estimated_duration_minutes: workoutData.estimated_duration_minutes || 45,
        generated_by_ai: true,
        is_active: true
      })
      .select()
      .single();

    if (routineError) {
      console.error("Error saving routine:", routineError);
      throw new Error(`Error al guardar la rutina: ${routineError.message}`);
    }

    console.log("Routine saved with id:", routine.id);

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
