import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Clock, Calendar, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { GlassCard } from '@/components/ui/GlassCard';
import { toast } from 'sonner';

const DAYS = [
  { id: 'lunes', label: 'L' },
  { id: 'martes', label: 'M' },
  { id: 'miércoles', label: 'X' },
  { id: 'jueves', label: 'J' },
  { id: 'viernes', label: 'V' },
  { id: 'sábado', label: 'S' },
  { id: 'domingo', label: 'D' },
];

const TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00',
];

export function NotificationSettings() {
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    loading, 
    subscribe, 
    unsubscribe,
    updatePreferences 
  } = usePushNotifications();

  const [selectedDays, setSelectedDays] = useState<string[]>(['lunes', 'miércoles', 'viernes']);
  const [selectedTime, setSelectedTime] = useState('18:00');
  const [saving, setSaving] = useState(false);

  const toggleDay = (dayId: string) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    const success = await updatePreferences(selectedTime, selectedDays);
    setSaving(false);
    if (success) {
      toast.success('¡Tu coach te recordará entrenar!');
    }
  };

  if (!isSupported) {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <BellOff className="w-5 h-5" />
          <p className="text-sm">Tu navegador no soporta notificaciones push.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isSubscribed ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
            {isSubscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold">Coach Proactivo</h3>
            <p className="text-xs text-muted-foreground">
              {isSubscribed ? 'El coach te recordará entrenar' : 'Activa para que el coach te motive'}
            </p>
          </div>
        </div>
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={loading}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            isSubscribed 
              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' 
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSubscribed ? 'Desactivar' : 'Activar'}
        </button>
      </div>

      {isSubscribed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4 pt-4 border-t border-border"
        >
          {/* Training Days */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Días de entrenamiento</span>
            </div>
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                    selectedDays.includes(day.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Time */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Hora preferida</span>
            </div>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {TIMES.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSavePreferences}
            disabled={saving || selectedDays.length === 0}
            className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              'Guardar preferencias'
            )}
          </button>
        </motion.div>
      )}

      {permission === 'denied' && (
        <p className="text-xs text-destructive">
          Las notificaciones están bloqueadas. Habilítalas en la configuración de tu navegador.
        </p>
      )}
    </GlassCard>
  );
}
