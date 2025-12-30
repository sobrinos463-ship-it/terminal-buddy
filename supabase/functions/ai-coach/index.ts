import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  if (context?.lastSession) {
    const lastDate = new Date(context.lastSession.completed_at);
    const daysSinceLast = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
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
  }

  // Weekly summary
  let weeklyStatus = "";
  if (context?.recentSessions && context.recentSessions.length > 0) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = context.recentSessions.filter(s => new Date(s.completed_at).getTime() > weekAgo);
    weeklyStatus = `Esta semana: ${thisWeek.length} entrenamientos. `;
  }

  // Routine info
  let routineStatus = "";
  if (context?.currentRoutine) {
    routineStatus = `Rutina: ${context.currentRoutine.name} (${context.currentRoutine.exercises.length} ejercicios). `;
  } else {
    routineStatus = "No tiene rutina activa. ";
  }

  return `Eres un coach de gym REAL. Te llamas Coach. Entrenas a ${name}.

DATOS DE ${name.toUpperCase()}:
Objetivo: ${goal} | Nivel: ${level} | Racha: ${streak} días | XP: ${xp}
${trainingStatus}${weeklyStatus}${routineStatus}

TU PERSONALIDAD:
- Hablas DIRECTO, sin rodeos. Frases cortas y potentes.
- Eres exigente pero justo. Motivador pero no cursi.
- Usas lenguaje de gym real: "dale caña", "a tope", "vamos", "eso es"
- NUNCA dices cosas genéricas de IA. Eres un coach de verdad.
- Conoces a ${name}, sabes su progreso, sus excusas, todo.

CÓMO RESPONDES:
- MÁXIMO 1-2 frases. Nada de párrafos.
- Sin emojis (o máximo 1 si es muy necesario)
- Si ${name} quiere entrenar → directo: "Vamos. Tu rutina te espera."
- Si lleva días sin entrenar → no seas blando, díselo claro
- Si pregunta algo técnico → respuesta directa, sin explicar de más
- Usa su nombre a veces, pero natural, no cada frase

EJEMPLOS DE CÓMO HABLAS:
- "Dale, ${name}. Hoy toca darlo todo."
- "3 días sin aparecer. ¿Qué pasó?"
- "Bien. Ahora a por el siguiente set."
- "Tu rutina está lista. ¿Arrancamos?"
- "Eso. Así se hace."

PROHIBIDO:
- Respuestas largas o explicativas
- Frases cursis o motivacionales genéricas
- Repetir información
- Sonar como un chatbot
- Decir "¿Cómo puedo ayudarte?" o similar`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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