import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const systemPrompt = `Eres un entrenador personal experto en análisis de forma y técnica de ejercicios.
Analiza la imagen del usuario realizando el ejercicio "${exerciseName || "ejercicio"}" y proporciona retroalimentación detallada.

DEBES responder SOLO con un JSON válido, sin texto adicional. El formato es:
{
  "overallScore": <número 0-100>,
  "issues": [
    {
      "bodyPart": "<parte del cuerpo>",
      "severity": "<warning|error|good>",
      "message": "<problema detectado>",
      "correction": "<cómo corregirlo>",
      "angle": <ángulo actual opcional>,
      "idealAngle": <ángulo ideal opcional>
    }
  ],
  "tempo": <segundos estimados de la rep>,
  "depth": "<shallow|parallel|deep>",
  "depthScore": "<Malo|Regular|Bueno|Excelente>"
}

Analiza:
1. Posición de la espalda (neutral, arqueada, redondeada)
2. Posición de las rodillas (alineadas con pies, hacia dentro, hacia fuera)
3. Posición de los pies (ancho correcto, rotación)
4. Profundidad del movimiento
5. Posición de la cabeza y cuello
6. Si aplica: agarre, posición de codos, activación del core

Sé específico y útil. Si la imagen no muestra claramente un ejercicio, indica que necesitas mejor ángulo.`;

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