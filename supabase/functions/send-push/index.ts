import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push library for sending notifications
// VAPID keys should be generated and stored as secrets
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

// Simple JWT creation for VAPID
async function createVapidJWT(audience: string): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: "mailto:coach@terminal-buddy.app",
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  // For now, we'll use a simplified approach
  // In production, this should use proper ECDSA signing
  return `${headerB64}.${payloadB64}.signature`;
}

async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const url = new URL(subscription.endpoint);
    
    // Create authorization header
    const vapidAuth = await createVapidJWT(url.origin);
    
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
        "Authorization": `vapid t=${vapidAuth}, k=${VAPID_PUBLIC_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Push send failed:", response.status, await response.text());
      return false;
    }

    console.log("Push notification sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending push:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, title, body, url } = await req.json();

    // Get user's push subscription
    const { data: notificationSettings, error: fetchError } = await supabaseClient
      .from("user_notifications")
      .select("push_subscription, notifications_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching subscription:", fetchError);
      throw fetchError;
    }

    if (!notificationSettings?.push_subscription || !notificationSettings.notifications_enabled) {
      return new Response(
        JSON.stringify({ success: false, reason: "No subscription or disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subscription = notificationSettings.push_subscription as unknown as PushSubscription;
    
    const success = await sendPushNotification(subscription, {
      title: title || "Coach IA",
      body: body || "¡Es hora de entrenar!",
      url: url || "/training",
      icon: "/favicon.ico",
      tag: "coach-reminder",
    });

    // Update last notified timestamp
    if (success) {
      await supabaseClient
        .from("user_notifications")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({ success }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
