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
    lose_fat: "perder grasa",
    build_muscle: "ganar masa muscular",
    strength: "aumentar fuerza",
    endurance: "mejorar resistencia",
    maintain: "mantenerse en forma"
  };

  const levelLabels: Record<string, string> = {
    beginner: "principiante",
    intermediate: "intermedio",
    advanced: "avanzado",
    elite: "élite"
  };

  let userInfo = "";
  if (context?.profile) {
    const name = context.profile.full_name?.split(" ")[0] || "usuario";
    const goal = goalLabels[context.profile.goal || ""] || "entrenar";
    const level = levelLabels[context.profile.experience_level || ""] || "intermedio";
    userInfo = `
USUARIO:
- Nombre: ${name}
- Objetivo: ${goal}
- Nivel: ${level}
- Racha: ${context.profile.streak_days} días
- XP: ${context.profile.total_xp}
- Días con objetivo actual: ${context.daysSinceGoalSet}`;
  }

  let routineInfo = "";
  if (context?.currentRoutine) {
    const exercises = context.currentRoutine.exercises
      .map(e => `${e.name} (${e.sets}x${e.reps})`)
      .join(", ");
    routineInfo = `
RUTINA ACTIVA:
- ${context.currentRoutine.name}
- Músculos: ${context.currentRoutine.target_muscle_groups.join(", ")}
- Ejercicios: ${exercises}`;
  }

  let sessionInfo = "";
  if (context?.lastSession) {
    const lastDate = new Date(context.lastSession.completed_at);
    const daysSinceLast = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    const mins = Math.floor(context.lastSession.duration_seconds / 60);
    sessionInfo = `
ÚLTIMO ENTRENAMIENTO:
- Hace ${daysSinceLast} día(s)
- Duró ${mins} min
- ${context.lastSession.xp_earned} XP`;
  }

  let weeklyInfo = "";
  if (context?.recentSessions && context.recentSessions.length > 0) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = context.recentSessions.filter(s => new Date(s.completed_at).getTime() > weekAgo);
    const totalMins = thisWeek.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / 60;
    weeklyInfo = `
ESTA SEMANA:
- ${thisWeek.length} entrenamientos
- ${Math.round(totalMins)} min totales`;
  }

  // Check if should suggest goal review (after 60+ days)
  const shouldSuggestGoalReview = context?.daysSinceGoalSet && context.daysSinceGoalSet >= 60;

  return `Eres el coach de fitness de ${context?.profile?.full_name?.split(" ")[0] || "un usuario"}.
${userInfo}${routineInfo}${sessionInfo}${weeklyInfo}

REGLAS:
1. Respuestas CORTAS (1-2 frases máximo)
2. Sin emojis excesivos (máximo 1)
3. Usa su nombre de vez en cuando
4. Solo responde lo que pregunta
5. Si quiere entrenar → guíalo a su rutina
6. Si quiere cambiar objetivo → sugiérele ir a Perfil
7. Habla natural, como un amigo del gym
${shouldSuggestGoalReview ? `8. Si es relevante, sugiere revisar su objetivo ya que lleva ${context?.daysSinceGoalSet} días con el mismo` : ""}

PROHIBIDO: respuestas largas, explicaciones innecesarias, repetir info, muchos emojis.`;
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