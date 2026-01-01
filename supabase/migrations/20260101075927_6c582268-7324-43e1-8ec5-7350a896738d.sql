-- Table for push notification subscriptions and training preferences
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  push_subscription JSONB,
  preferred_training_time TIME,
  training_days TEXT[] DEFAULT '{}',
  notifications_enabled BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own notification settings"
ON public.user_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
ON public.user_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
ON public.user_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_notifications_updated_at
BEFORE UPDATE ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();