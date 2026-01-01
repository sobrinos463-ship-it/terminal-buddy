import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Coach motivation messages for push notifications
const COACH_MESSAGES = {
  morning: [
    "Buenos días. ¿A qué hora entrenas hoy?",
    "Arriba. Tu rutina te espera.",
    "Día nuevo, oportunidad nueva. ¿Vamos?",
  ],
  reminder: [
    "¿Ya entrenaste hoy? No me hagas ir a buscarte.",
    "El gym no viene a ti. Tú vas al gym.",
    "Cada día que no entrenas, alguien más te supera.",
  ],
  streak: [
    "Llevas {streak} días de racha. No lo tires ahora.",
    "{streak} días seguidos. Eso es disciplina.",
    "Tu racha de {streak} días es brutal. Mantén.",
  ],
  inactive: [
    "{days} días sin entrenar. ¿Qué pasó?",
    "Te has perdido. Vuelve al gym.",
    "Las excusas no queman calorías. Vamos.",
  ],
};

function getRandomMessage(category: keyof typeof COACH_MESSAGES, replacements?: Record<string, string>): string {
  const messages = COACH_MESSAGES[category];
  let message = messages[Math.floor(Math.random() * messages.length)];
  
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, value);
    });
  }
  
  return message;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Coach reminder cron job started");

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Map day names
    const dayMap: Record<string, string[]> = {
      'monday': ['2-3 días', '4-5 días', '6+ días', 'lunes'],
      'tuesday': ['2-3 días', '4-5 días', '6+ días', 'martes'],
      'wednesday': ['2-3 días', '4-5 días', '6+ días', 'miércoles'],
      'thursday': ['4-5 días', '6+ días', 'jueves'],
      'friday': ['4-5 días', '6+ días', 'viernes'],
      'saturday': ['6+ días', 'sábado'],
      'sunday': ['6+ días', 'domingo'],
    };

    // Get all users with notifications enabled
    const { data: users, error: usersError } = await supabaseClient
      .from("user_notifications")
      .select(`
        user_id,
        preferred_training_time,
        training_days,
        last_notified_at,
        push_subscription
      `)
      .eq("notifications_enabled", true)
      .not("push_subscription", "is", null);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    console.log(`Found ${users?.length || 0} users with notifications enabled`);

    let notificationsSent = 0;

    for (const user of users || []) {
      try {
        // Check if user should be notified today
        const shouldNotifyToday = user.training_days?.some((day: string) => 
          dayMap[currentDay]?.includes(day)
        );

        if (!shouldNotifyToday) continue;

        // Check if already notified today
        if (user.last_notified_at) {
          const lastNotified = new Date(user.last_notified_at);
          if (lastNotified.toDateString() === now.toDateString()) {
            continue; // Already notified today
          }
        }

        // Check if it's the right time (within 1 hour of preferred time)
        if (user.preferred_training_time) {
          const [prefHour] = user.preferred_training_time.split(':').map(Number);
          const hourDiff = Math.abs(currentHour - prefHour);
          if (hourDiff > 1 && hourDiff < 23) continue; // Not the right time
        }

        // Get user's profile and last session
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("full_name, streak_days")
          .eq("user_id", user.user_id)
          .maybeSingle();

        const { data: lastSession } = await supabaseClient
          .from("workout_sessions")
          .select("completed_at")
          .eq("user_id", user.user_id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Determine message category
        let message: string;
        const streak = profile?.streak_days || 0;

        if (lastSession) {
          const daysSinceLastSession = Math.floor(
            (Date.now() - new Date(lastSession.completed_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceLastSession >= 3) {
            message = getRandomMessage("inactive", { days: daysSinceLastSession.toString() });
          } else if (streak >= 3) {
            message = getRandomMessage("streak", { streak: streak.toString() });
          } else {
            message = getRandomMessage("reminder");
          }
        } else {
          message = getRandomMessage("morning");
        }

        // Send push notification
        const pushResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              userId: user.user_id,
              title: `Coach IA${profile?.full_name ? ` para ${profile.full_name}` : ""}`,
              body: message,
              url: "/training",
            }),
          }
        );

        if (pushResponse.ok) {
          notificationsSent++;
          console.log(`Notification sent to user ${user.user_id}`);
        }
      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError);
      }
    }

    console.log(`Cron job completed. Sent ${notificationsSent} notifications.`);

    return new Response(
      JSON.stringify({ success: true, notificationsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in coach-reminder-cron:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
