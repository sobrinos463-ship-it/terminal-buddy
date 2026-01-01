import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'default';
  loading: boolean;
}

// VAPID public key - this needs to be generated and stored
// For now, we'll use a placeholder that should be replaced with a real key
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    loading: true,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      const permission = isSupported ? Notification.permission : 'default';
      
      setState(prev => ({
        ...prev,
        isSupported,
        permission,
        loading: false,
      }));

      if (isSupported && permission === 'granted') {
        // Check existing subscription
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setState(prev => ({ ...prev, isSubscribed: !!subscription }));
        } catch (e) {
          console.error('Error checking subscription:', e);
        }
      }
    };

    checkSupport();
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!user) {
      toast.error('Debes iniciar sesión primero');
      return false;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        toast.error('Necesitas permitir notificaciones');
        setState(prev => ({ ...prev, loading: false }));
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      console.log('Push subscription:', subscription);

      // Save subscription to database
      const subscriptionData = {
        user_id: user.id,
        push_subscription: subscription.toJSON() as any,
        notifications_enabled: true,
      };

      const { error } = await supabase
        .from('user_notifications')
        .upsert(subscriptionData, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setState(prev => ({ ...prev, isSubscribed: true, loading: false }));
      toast.success('¡Notificaciones activadas!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Error al activar notificaciones');
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [user, registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Update database
      await supabase
        .from('user_notifications')
        .update({
          push_subscription: null,
          notifications_enabled: false,
        })
        .eq('user_id', user.id);

      setState(prev => ({ ...prev, isSubscribed: false, loading: false }));
      toast.success('Notificaciones desactivadas');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Error al desactivar notificaciones');
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [user]);

  // Update training preferences
  const updatePreferences = useCallback(async (
    preferredTime: string,
    trainingDays: string[]
  ) => {
    if (!user) return false;

    try {
      const prefData = {
        user_id: user.id,
        preferred_training_time: preferredTime,
        training_days: trainingDays,
      };

      const { error } = await supabase
        .from('user_notifications')
        .upsert(prefData, {
          onConflict: 'user_id',
        });

      if (error) throw error;
      toast.success('Preferencias guardadas');
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Error al guardar preferencias');
      return false;
    }
  }, [user]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    updatePreferences,
  };
}
