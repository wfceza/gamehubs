
-- Fix missing RLS policy for profile creation
CREATE POLICY "Users can create their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Add comprehensive audit logging table
CREATE TABLE public.security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on security logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only allow system to insert security logs (via security definer functions)
CREATE POLICY "System can insert security logs" 
  ON public.security_logs 
  FOR INSERT 
  WITH CHECK (false); -- Will be handled by security definer functions

-- Admins can view all security logs (for future admin functionality)
CREATE POLICY "System can view security logs" 
  ON public.security_logs 
  FOR SELECT 
  USING (false); -- Will be handled by security definer functions

-- Add payment verification tracking to prevent duplicate payments
CREATE TABLE public.payment_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gold_amount INTEGER NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on payment verifications
ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payment verifications
CREATE POLICY "Users can view their own payment verifications" 
  ON public.payment_verifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX idx_security_logs_created_at ON public.security_logs(created_at);
CREATE INDEX idx_payment_verifications_user_id ON public.payment_verifications(user_id);
CREATE INDEX idx_payment_verifications_stripe_session ON public.payment_verifications(stripe_session_id);

-- Security definer function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_logs (user_id, event_type, event_data, ip_address, user_agent)
  VALUES (p_user_id, p_event_type, p_event_data, p_ip_address, p_user_agent);
END;
$$;

-- Add game validation constraints
ALTER TABLE public.games 
ADD CONSTRAINT check_stake_amount_positive 
CHECK (stake_amount > 0 AND stake_amount <= 1000);

-- Add message length constraints
ALTER TABLE public.chat_messages 
ADD CONSTRAINT check_message_length 
CHECK (length(content) <= 1000);

-- Add username validation constraints
ALTER TABLE public.profiles 
ADD CONSTRAINT check_username_length 
CHECK (length(username) >= 3 AND length(username) <= 20),
ADD CONSTRAINT check_username_format 
CHECK (username ~ '^[a-zA-Z0-9_-]+$');
