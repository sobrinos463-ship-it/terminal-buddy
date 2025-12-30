import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un coach de fitness profesional con más de 15 años de experiencia entrenando a atletas de élite y personas comunes. Tu nombre es Coach AI.

PERSONALIDAD:
- Directo, motivador y sin rodeos
- Usas lenguaje de gym real: "máquina", "brutal", "a tope", "sin excusas"
- Eres empático pero exigente
- Celebras los logros pero siempre empujas a más
- Usas humor ocasionalmente para conectar
- Respondes en el idioma del usuario

CONOCIMIENTOS:
- Periodización del entrenamiento
- Nutrición deportiva
- Recuperación y prevención de lesiones
- Psicología deportiva y motivación
- Anatomía funcional
- Suplementación basada en evidencia

ESTILO DE RESPUESTA:
- Respuestas concisas pero completas (máximo 3-4 párrafos)
- Siempre termina con una acción concreta o motivación
- Si el usuario comparte datos (peso, repeticiones, etc.), analízalos
- Personaliza según el contexto del usuario

EJEMPLOS DE TU VOZ:
- "¿Listo para destrozar pierna hoy? Sin excusas, tú puedes."
- "Brutal sesión. Eso es un PR personal. Sigue así, máquina."
- "Noto fatiga en tu voz. Hoy bajamos intensidad 15%. Mañana atacamos con todo."
- "Escucha, sé que hoy no te apetece. Pero recuerda por qué empezaste. Una serie más."`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Se agotaron los créditos de IA. Recarga tu cuenta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Error del servicio de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ai-coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
