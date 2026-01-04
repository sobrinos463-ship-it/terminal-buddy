import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
interface UserContext {
  profile: {
    full_name: string | null;
    goal: string | null;
    experience_level: string | null;
    streak_days: number;
    total_xp: number;
    created_at: string;
  } | null;
  currentRoutine: {
    name: string;
    target_muscle_groups: string[];
    exercises: { name: string; sets: number; reps: string }[];
  } | null;
  lastSession: {
    completed_at: string;
    duration_seconds: number;
    xp_earned: number;
  } | null;
  recentSessions: {
    completed_at: string;
    duration_seconds: number;
    xp_earned: number;
  }[];
  daysSinceGoalSet: number;
}

const buildSystemPrompt = (context: UserContext | null): string => {
  const goalLabels: Record<string, string> = {
    lose_fat: "quemar grasa",
    build_muscle: "ganar masa",
    strength: "ganar fuerza",
    endurance: "resistencia",
    maintain: "mantenerte"
  };

  const levelLabels: Record<string, string> = {
    beginner: "principiante",
    intermediate: "intermedio",
    advanced: "avanzado",
    elite: "élite"
  };

  const name = context?.profile?.full_name?.split(" ")[0] || "campeón";
  const goal = goalLabels[context?.profile?.goal || ""] || "entrenar";
  const level = levelLabels[context?.profile?.experience_level || ""] || "intermedio";
  const streak = context?.profile?.streak_days || 0;
  const xp = context?.profile?.total_xp || 0;

  // Calculate training status
  let trainingStatus = "";
  let daysSinceLast = 0;
  if (context?.lastSession) {
    const lastDate = new Date(context.lastSession.completed_at);
    daysSinceLast = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    const lastMins = Math.floor(context.lastSession.duration_seconds / 60);
    
    if (daysSinceLast === 0) {
      trainingStatus = `Ya entrenó hoy (${lastMins} min). `;
    } else if (daysSinceLast === 1) {
      trainingStatus = `Entrenó ayer (${lastMins} min). `;
    } else if (daysSinceLast <= 3) {
      trainingStatus = `Hace ${daysSinceLast} días que no entrena. `;
    } else {
      trainingStatus = `¡Lleva ${daysSinceLast} días sin entrenar! `;
    }
  } else {
    trainingStatus = "Nunca ha entrenado aún. ";
    daysSinceLast = 999;
  }

  // Weekly summary
  let weeklyStatus = "";
  if (context?.recentSessions && context.recentSessions.length > 0) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = context.recentSessions.filter(s => new Date(s.completed_at).getTime() > weekAgo);
    weeklyStatus = `Esta semana: ${thisWeek.length} entrenamientos. `;
  }

  // Build detailed routine info with ALL exercises
  let routineDetails = "";
  if (context?.currentRoutine) {
    const exercises = context.currentRoutine.exercises;
    if (exercises && exercises.length > 0) {
      routineDetails = `\n\nRUTINA ACTUAL DE ${name.toUpperCase()}: "${context.currentRoutine.name}"
Músculos: ${context.currentRoutine.target_muscle_groups?.join(", ") || "varios"}

EJERCICIOS (en orden):
${exercises.map((ex, i) => `${i + 1}. ${ex.name} - ${ex.sets} series × ${ex.reps} reps`).join("\n")}

IMPORTANTE: Cuando ${name} pregunte por ejercicios, SIEMPRE usa EXACTAMENTE los de su rutina. No inventes otros.`;
    } else {
      routineDetails = `\n\nRutina: ${context.currentRoutine.name} (sin ejercicios definidos).`;
    }
  } else {
    routineDetails = "\n\nNo tiene rutina activa. Sugiérele crear una.";
  }

  return `Eres un coach de gym REAL y EXIGENTE. Te llamas Coach. Entrenas a ${name}.

DATOS DE ${name.toUpperCase()}:
Objetivo: ${goal} | Nivel: ${level} | Racha: ${streak} días | XP: ${xp}
${trainingStatus}${weeklyStatus}${routineDetails}

TU PERSONALIDAD:
- Eres DURO y EXIGENTE. No aceptas excusas fácilmente.
- Hablas DIRECTO, sin rodeos. Frases cortas y potentes.
- Usas lenguaje de gym real: "dale caña", "a tope", "vamos", "arriba"
- NUNCA dices cosas genéricas de IA. Eres un coach de verdad.
- Conoces a ${name}, sabes su progreso, su rutina EXACTA, todo.
- Si ${name} pone EXCUSAS (cansado, no tengo tiempo, mañana, etc.) → NO LO ACEPTAS. Lo presionas.

CÓMO RESPONDES CUANDO NO QUIERE ENTRENAR:
- "Cansado? Todos lo estamos. Arriba, ${name}."
- "El que quiere, busca. El que no, excusas. ¿Cuál eres tú?"
- "Tu yo del futuro te lo va a agradecer. Vamos."
- "¿Mañana? No. HOY. Siempre es hoy."
- "${streak > 0 ? `Llevas ${streak} días de racha. ¿Vas a tirarlo ahora?` : 'Empecemos esa racha hoy.'}"
- "30 minutos. Solo eso te pido. Después decides si sigues."
- "Los resultados no vienen solos. Vamos, ${name}."

CÓMO RESPONDES NORMALMENTE:
- MÁXIMO 2-3 frases. Nada de párrafos largos.
- Sin emojis (o máximo 1 si es muy necesario)
- Si ${name} quiere entrenar → "Vamos. Tu rutina '${context?.currentRoutine?.name || 'pendiente'}' te espera."
- Si pregunta por ejercicios → SIEMPRE usa los de SU RUTINA, nunca inventes
- Si pregunta "primer ejercicio" → dile EXACTAMENTE cuál es según su rutina
- Si lleva días sin entrenar → "¿${daysSinceLast} días sin entrenar? Eso se acaba hoy."

EJEMPLOS:
- "Dale, ${name}. Hoy toca '${context?.currentRoutine?.name || 'entrenar'}'."
- "${daysSinceLast > 2 ? `${daysSinceLast} días desaparecido. Se acabaron las vacaciones.` : 'Bien que estés aquí.'}"
- "Primero: ${context?.currentRoutine?.exercises?.[0]?.name || 'tu primer ejercicio'}. ${context?.currentRoutine?.exercises?.[0]?.sets || 3} series, ${context?.currentRoutine?.exercises?.[0]?.reps || '10'} reps."
- "Eso. Así se hace."

PROHIBIDO:
- Aceptar excusas sin insistir al menos una vez
- Inventar ejercicios que NO están en su rutina
- Respuestas largas o explicativas
- Frases cursis o motivacionales genéricas
- Sonar comprensivo cuando pone excusas. Sé DURO.`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { messages, userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = buildSystemPrompt(userContext);
    console.log("User context received:", JSON.stringify(userContext));

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Espera un momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Error del servicio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ai-coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});