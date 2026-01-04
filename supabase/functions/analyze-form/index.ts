import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
interface FormAnalysis {
  overallScore: number;
  issues: {
    bodyPart: string;
    severity: "warning" | "error" | "good";
    message: string;
    correction: string;
    angle?: number;
    idealAngle?: number;
  }[];
  tempo: number;
  depth: "shallow" | "parallel" | "deep";
  depthScore: string;
}

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

    console.log("Authenticated user for analyze-form:", user.id);

    const { imageBase64, exerciseName } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Eres un entrenador personal experto en análisis biomecánico y técnica de ejercicios de gimnasio.
Analiza la imagen del usuario realizando "${exerciseName || "ejercicio"}" y proporciona retroalimentación detallada.

DEBES responder SOLO con un JSON válido, sin texto adicional ni markdown. El formato exacto es:
{
  "overallScore": <número 0-100>,
  "issues": [
    {
      "bodyPart": "<parte del cuerpo: cabeza/cuello/espalda/hombros/codos/muñecas/caderas/rodillas/tobillos>",
      "severity": "<warning|error|good>",
      "message": "<problema específico detectado, máximo 10 palabras>",
      "correction": "<instrucción clara de cómo corregir, máximo 15 palabras>",
      "angle": <ángulo actual en grados, opcional>,
      "idealAngle": <ángulo ideal en grados, opcional>
    }
  ],
  "bodyPoints": [
    {
      "name": "<nombre del punto: Cabeza|Hombros|Codos|Muñecas|Caderas|Rodillas|Tobillos>",
      "status": "<good|warning|error>",
      "angle": <ángulo detectado, opcional>,
      "idealAngle": <ángulo ideal, opcional>
    }
  ],
  "tempo": <segundos estimados por repetición>,
  "depth": "<shallow|parallel|deep>",
  "depthScore": "<Malo|Regular|Bueno|Excelente>"
}

ANÁLISIS DETALLADO POR PUNTOS CORPORALES:
1. CABEZA: ¿Neutral o inclinada? Debe mirar al frente o ligeramente abajo
2. HOMBROS: ¿Retraídos y estables? ¿Elevados innecesariamente?
3. CODOS: Ángulo según ejercicio (90° en press, extensión completa en jalones)
4. MUÑECAS: ¿Alineadas con antebrazos? Sin flexión excesiva
5. ESPALDA: ¿Neutral, arqueada o redondeada? Mantener curva lumbar natural
6. CADERAS: Bisagra correcta en peso muerto, estabilidad en sentadilla
7. RODILLAS: ¿Alineadas con pies? No colapsar hacia dentro (valgo)
8. TOBILLOS: Dorsiflexión adecuada, talones en el suelo

SEVERIDADES:
- "error": Riesgo de lesión inmediato, requiere corrección urgente
- "warning": Subóptimo, afecta rendimiento pero no es peligroso
- "good": Técnica correcta en ese punto

Si no puedes ver claramente la postura, indica que necesitas mejor ángulo con severity "warning".
Sé directo y específico. Prioriza seguridad sobre todo.`;

    console.log("Analyzing exercise form for:", exerciseName);

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
          { 
            role: "user", 
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              },
              {
                type: "text",
                text: `Analiza la forma de este ejercicio: ${exerciseName || "ejercicio de gimnasio"}. Responde SOLO con JSON válido.`
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Error del servicio de IA");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response:", content.substring(0, 200));

    // Parse JSON from response
    let analysis: FormAnalysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Return a default analysis if parsing fails
      analysis = {
        overallScore: 75,
        issues: [{
          bodyPart: "general",
          severity: "warning",
          message: "No se pudo analizar la imagen correctamente",
          correction: "Intenta con mejor iluminación y ángulo"
        }],
        tempo: 2.0,
        depth: "parallel",
        depthScore: "Regular"
      };
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("analyze-form error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});