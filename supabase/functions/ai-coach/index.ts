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
USUARIO ACTUAL:
- Nombre: ${name}
- Objetivo: ${goal}
- Nivel: ${level}
- Racha: ${context.profile.streak_days} días
- XP acumulados: ${context.profile.total_xp}`;
  }

  let routineInfo = "";
  if (context?.currentRoutine) {
    const exercises = context.currentRoutine.exercises
      .map(e => `${e.name} (${e.sets}x${e.reps})`)
      .join(", ");
    routineInfo = `
RUTINA ACTIVA:
- Nombre: ${context.currentRoutine.name}
- Músculos: ${context.currentRoutine.target_muscle_groups.join(", ")}
- Ejercicios: ${exercises}`;
  }

  let sessionInfo = "";
  if (context?.lastSession) {
    const date = new Date(context.lastSession.completed_at).toLocaleDateString("es-ES");
    const mins = Math.floor(context.lastSession.duration_seconds / 60);
    sessionInfo = `
ÚLTIMA SESIÓN:
- Fecha: ${date}
- Duración: ${mins} minutos
- XP ganados: ${context.lastSession.xp_earned}`;
  }

  return `Eres un coach de fitness. Conoces al usuario y su contexto.
${userInfo}
${routineInfo}
${sessionInfo}

REGLAS ESTRICTAS:
1. Respuestas CORTAS (máximo 2-3 frases)
2. Sin emojis excesivos (máximo 1 por mensaje)
3. Directo al grano, sin rodeos
4. Usa el nombre del usuario cuando sea natural
5. Responde SOLO lo que pregunta, nada más
6. Si mencionan entrenar, guíalos a su rutina actual
7. Si piden cambiar objetivo, sugiéreles ir a Perfil
8. Habla como un amigo del gym, no como un robot

PROHIBIDO:
- Respuestas largas
- Explicaciones innecesarias
- Repetir información que el usuario ya sabe
- Usar muchos emojis o signos de exclamación`;
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